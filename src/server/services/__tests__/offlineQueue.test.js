const OfflineQueue = require('../offlineQueue');
const { createTestDatabase, closeTestDatabase, clearTestDatabase } = require('../../__tests__/helpers/testDatabase');

describe('OfflineQueue', () => {
  let queue;
  let db;

  beforeEach(() => {
    db = createTestDatabase();
    queue = new OfflineQueue(db);
  });

  afterEach(() => {
    clearTestDatabase(db);
    closeTestDatabase(db);
    if (queue) {
      queue.close();
    }
  });

  describe('Queue Check-in', () => {
    it('should queue a check-in', async () => {
      const checkinData = {
        customerId: 'CUSTOMER_1',
        orderId: 'ORDER_1',
        guestCount: 2
      };

      const result = await queue.queueCheckin(checkinData);

      expect(result).toBeDefined();
      expect(result.customerId).toBe('CUSTOMER_1');
      expect(result.orderId).toBe('ORDER_1');
      expect(result.guestCount).toBe(2);
      expect(result.status).toBe('pending');
      expect(result.id).toBeDefined();
    });

    it('should throw error for missing required fields', async () => {
      await expect(queue.queueCheckin({})).rejects.toThrow('Missing required check-in data');
      await expect(queue.queueCheckin({ customerId: 'C1' })).rejects.toThrow('Missing required check-in data');
      await expect(queue.queueCheckin({ customerId: 'C1', orderId: 'O1' })).rejects.toThrow('Missing required check-in data');
    });
  });

  describe('Get Pending Check-ins', () => {
    it('should return empty array when no pending check-ins', () => {
      const pending = queue.getPendingCheckins();
      expect(pending).toEqual([]);
    });

    it('should return pending check-ins in order', async () => {
      // Queue multiple check-ins
      await queue.queueCheckin({
        customerId: 'C1',
        orderId: 'O1',
        guestCount: 1
      });

      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure different timestamps

      await queue.queueCheckin({
        customerId: 'C2',
        orderId: 'O2',
        guestCount: 2
      });

      const pending = queue.getPendingCheckins();

      expect(pending).toHaveLength(2);
      expect(pending[0].customer_id).toBe('C1'); // First queued should be first
      expect(pending[1].customer_id).toBe('C2');
    });

    it('should respect limit parameter', async () => {
      // Queue multiple check-ins
      for (let i = 0; i < 5; i++) {
        await queue.queueCheckin({
          customerId: `C${i}`,
          orderId: `O${i}`,
          guestCount: 1
        });
      }

      const pending = queue.getPendingCheckins(3);
      expect(pending).toHaveLength(3);
    });
  });

  describe('Mark as Synced', () => {
    it('should mark check-in as synced', async () => {
      const queued = await queue.queueCheckin({
        customerId: 'C1',
        orderId: 'O1',
        guestCount: 1
      });

      const result = queue.markAsSynced(queued.id);
      expect(result).toBe(true);

      // Verify status updated
      const pending = queue.getPendingCheckins();
      expect(pending).toHaveLength(0);

      // Check synced_at is set
      const synced = db.prepare(`
        SELECT * FROM checkin_queue WHERE id = ?
      `).get(queued.id);

      expect(synced.status).toBe('synced');
      expect(synced.synced_at).toBeDefined();
    });

    it('should return false for non-existent check-in', () => {
      const result = queue.markAsSynced(99999);
      expect(result).toBe(false);
    });
  });

  describe('Mark as Failed', () => {
    it('should mark check-in as failed', async () => {
      const queued = await queue.queueCheckin({
        customerId: 'C1',
        orderId: 'O1',
        guestCount: 1
      });

      const result = queue.markAsFailed(queued.id, 'Test error');
      expect(result).toBe(true);

      // Verify status updated
      const failed = db.prepare(`
        SELECT * FROM checkin_queue WHERE id = ? AND status = 'failed'
      `).get(queued.id);

      expect(failed).toBeDefined();
      expect(failed.status).toBe('failed');
    });
  });

  describe('Sync Queue', () => {
    it('should sync all pending check-ins', async () => {
      // Queue multiple check-ins
      await queue.queueCheckin({
        customerId: 'C1',
        orderId: 'O1',
        guestCount: 1
      });
      await queue.queueCheckin({
        customerId: 'C2',
        orderId: 'O2',
        guestCount: 2
      });

      const syncFunction = jest.fn().mockResolvedValue(true);

      const result = await queue.syncQueue(syncFunction);

      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
      expect(syncFunction).toHaveBeenCalledTimes(2);

      // Verify all are synced
      const pending = queue.getPendingCheckins();
      expect(pending).toHaveLength(0);
    });

    it('should handle sync failures', async () => {
      await queue.queueCheckin({
        customerId: 'C1',
        orderId: 'O1',
        guestCount: 1
      });

      const syncFunction = jest.fn().mockRejectedValue(new Error('Sync failed'));

      const result = await queue.syncQueue(syncFunction);

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should return zero counts when no pending check-ins', async () => {
      const result = await queue.syncQueue();
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('Queue Statistics', () => {
    it('should return correct statistics', async () => {
      // Queue some check-ins
      const q1 = await queue.queueCheckin({
        customerId: 'C1',
        orderId: 'O1',
        guestCount: 1
      });
      const q2 = await queue.queueCheckin({
        customerId: 'C2',
        orderId: 'O2',
        guestCount: 2
      });

      // Mark one as synced
      queue.markAsSynced(q1.id);

      // Mark one as failed
      queue.markAsFailed(q2.id, 'Test error');

      const stats = queue.getQueueStats();

      expect(stats.pending).toBe(0);
      expect(stats.synced).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.total).toBe(2);
    });

    it('should return zero stats for empty queue', () => {
      const stats = queue.getQueueStats();
      expect(stats.pending).toBe(0);
      expect(stats.synced).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.total).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should clear old synced check-ins', async () => {
      // Queue and sync a check-in
      const queued = await queue.queueCheckin({
        customerId: 'C1',
        orderId: 'O1',
        guestCount: 1
      });
      queue.markAsSynced(queued.id);

      // Manually set synced_at to old date
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31); // 31 days ago
      db.prepare(`
        UPDATE checkin_queue SET synced_at = ? WHERE id = ?
      `).run(oldDate.toISOString(), queued.id);

      const deleted = queue.clearOldSyncedCheckins(30);
      expect(deleted).toBe(1);

      // Verify deleted
      const remaining = db.prepare(`
        SELECT * FROM checkin_queue WHERE id = ?
      `).get(queued.id);

      expect(remaining).toBeUndefined();
    });

    it('should not delete recent synced check-ins', async () => {
      const queued = await queue.queueCheckin({
        customerId: 'C1',
        orderId: 'O1',
        guestCount: 1
      });
      queue.markAsSynced(queued.id);

      const deleted = queue.clearOldSyncedCheckins(30);
      expect(deleted).toBe(0);

      // Verify still exists
      const remaining = db.prepare(`
        SELECT * FROM checkin_queue WHERE id = ?
      `).get(queued.id);

      expect(remaining).toBeDefined();
    });
  });
});

