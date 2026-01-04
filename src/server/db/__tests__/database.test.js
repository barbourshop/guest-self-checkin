const { createTestDatabase, closeTestDatabase, clearTestDatabase } = require('../../__tests__/helpers/testDatabase');

describe('Database Utilities', () => {
  let db;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    closeTestDatabase(db);
  });

  describe('Schema Creation', () => {
    it('should create membership_cache table', () => {
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='membership_cache'
      `).all();

      expect(tables).toHaveLength(1);
    });

    it('should create checkin_queue table', () => {
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='checkin_queue'
      `).all();

      expect(tables).toHaveLength(1);
    });

    it('should create checkin_log table', () => {
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='checkin_log'
      `).all();

      expect(tables).toHaveLength(1);
    });
  });

  describe('Membership Cache Operations', () => {
    it('should insert and retrieve membership cache entry', () => {
      const customerId = 'CUSTOMER_1';
      const hasMembership = 1;
      const catalogItemId = 'ITEM_1';
      const variantId = 'VARIANT_1';
      const lastVerified = new Date().toISOString();

      // Insert
      db.prepare(`
        INSERT INTO membership_cache 
        (customer_id, has_membership, membership_catalog_item_id, membership_variant_id, last_verified_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(customerId, hasMembership, catalogItemId, variantId, lastVerified);

      // Retrieve
      const result = db.prepare(`
        SELECT * FROM membership_cache WHERE customer_id = ?
      `).get(customerId);

      expect(result).toBeDefined();
      expect(result.customer_id).toBe(customerId);
      expect(result.has_membership).toBe(hasMembership);
      expect(result.membership_catalog_item_id).toBe(catalogItemId);
      expect(result.membership_variant_id).toBe(variantId);
    });

    it('should update membership cache entry', () => {
      const customerId = 'CUSTOMER_1';
      const initialVerified = new Date(Date.now() - 3600000).toISOString();
      const updatedVerified = new Date().toISOString();

      // Insert initial
      db.prepare(`
        INSERT INTO membership_cache 
        (customer_id, has_membership, last_verified_at)
        VALUES (?, ?, ?)
      `).run(customerId, 1, initialVerified);

      // Update
      db.prepare(`
        UPDATE membership_cache 
        SET has_membership = ?, last_verified_at = ?
        WHERE customer_id = ?
      `).run(0, updatedVerified, customerId);

      const result = db.prepare(`
        SELECT * FROM membership_cache WHERE customer_id = ?
      `).get(customerId);

      expect(result.has_membership).toBe(0);
      expect(result.last_verified_at).toBe(updatedVerified);
    });
  });

  describe('Check-in Queue Operations', () => {
    it('should insert check-in into queue', () => {
      const customerId = 'CUSTOMER_1';
      const orderId = 'ORDER_1';
      const guestCount = 2;
      const createdAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO checkin_queue 
        (customer_id, order_id, guest_count, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(customerId, orderId, guestCount, 'pending', createdAt);

      const result = db.prepare(`
        SELECT * FROM checkin_queue WHERE customer_id = ? AND order_id = ?
      `).get(customerId, orderId);

      expect(result).toBeDefined();
      expect(result.customer_id).toBe(customerId);
      expect(result.order_id).toBe(orderId);
      expect(result.guest_count).toBe(guestCount);
      expect(result.status).toBe('pending');
    });

    it('should update queue status to synced', () => {
      const customerId = 'CUSTOMER_1';
      const orderId = 'ORDER_1';
      const createdAt = new Date().toISOString();
      const syncedAt = new Date().toISOString();

      // Insert
      db.prepare(`
        INSERT INTO checkin_queue 
        (customer_id, order_id, guest_count, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(customerId, orderId, 1, 'pending', createdAt);

      // Update to synced
      db.prepare(`
        UPDATE checkin_queue 
        SET status = ?, synced_at = ?
        WHERE customer_id = ? AND order_id = ?
      `).run('synced', syncedAt, customerId, orderId);

      const result = db.prepare(`
        SELECT * FROM checkin_queue 
        WHERE customer_id = ? AND order_id = ?
      `).get(customerId, orderId);

      expect(result.status).toBe('synced');
      expect(result.synced_at).toBe(syncedAt);
    });
  });

  describe('Check-in Log Operations', () => {
    it('should insert check-in log entry', () => {
      const customerId = 'CUSTOMER_1';
      const orderId = 'ORDER_1';
      const guestCount = 3;
      const timestamp = new Date().toISOString();

      db.prepare(`
        INSERT INTO checkin_log 
        (customer_id, order_id, guest_count, timestamp, synced_to_square)
        VALUES (?, ?, ?, ?, ?)
      `).run(customerId, orderId, guestCount, timestamp, 0);

      const result = db.prepare(`
        SELECT * FROM checkin_log WHERE customer_id = ? AND order_id = ?
      `).get(customerId, orderId);

      expect(result).toBeDefined();
      expect(result.customer_id).toBe(customerId);
      expect(result.order_id).toBe(orderId);
      expect(result.guest_count).toBe(guestCount);
      expect(result.synced_to_square).toBe(0);
    });
  });

  describe('Database Cleanup', () => {
    it('should clear all data', () => {
      // Insert test data
      db.prepare(`
        INSERT INTO membership_cache (customer_id, has_membership, last_verified_at)
        VALUES (?, ?, ?)
      `).run('C1', 1, new Date().toISOString());

      db.prepare(`
        INSERT INTO checkin_queue (customer_id, order_id, guest_count, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('C1', 'O1', 1, 'pending', new Date().toISOString());

      // Clear
      clearTestDatabase(db);

      // Verify cleared
      const cacheCount = db.prepare('SELECT COUNT(*) as count FROM membership_cache').get().count;
      const queueCount = db.prepare('SELECT COUNT(*) as count FROM checkin_queue').get().count;

      expect(cacheCount).toBe(0);
      expect(queueCount).toBe(0);
    });
  });
});

