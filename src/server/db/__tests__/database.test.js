const fs = require('fs');
const os = require('os');
const path = require('path');
const { createTestDatabase, closeTestDatabase, clearTestDatabase } = require('../../__tests__/helpers/testDatabase');
const {
  getDatabasePath,
  migrateLegacyDatabaseIfNeeded
} = require('../database');

describe('Database path and migration', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should use ELECTRON_USER_DATA for packaged Electron database path', () => {
    const userData = path.join(os.tmpdir(), 'electron-user-data-test');
    process.env.ELECTRON_USER_DATA = userData;
    delete process.env.DATABASE_PATH;
    expect(getDatabasePath()).toBe(path.join(userData, 'checkin.db'));
  });

  it('should migrate legacy database into userData when target is missing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'db-migrate-'));
    const legacyDir = path.join(root, 'resources');
    const userDataDir = path.join(root, 'userData');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.mkdirSync(userDataDir, { recursive: true });

    const legacyDb = path.join(legacyDir, 'checkin.db');
    const targetDb = path.join(userDataDir, 'checkin.db');
    fs.writeFileSync(legacyDb, 'legacy-db-marker');

    process.env.RESOURCES_PATH = legacyDir;
    process.env.ELECTRON_USER_DATA = userDataDir;

    migrateLegacyDatabaseIfNeeded(targetDb);

    expect(fs.existsSync(targetDb)).toBe(true);
    expect(fs.readFileSync(targetDb, 'utf8')).toBe('legacy-db-marker');
    fs.rmSync(root, { recursive: true, force: true });
  });
});

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
      const segmentIds = JSON.stringify(['SEGMENT_1']);
      const lastVerified = new Date().toISOString();

      // Insert (current schema: segment_ids, not catalog item/variant)
      db.prepare(`
        INSERT INTO membership_cache 
        (customer_id, has_membership, segment_ids, last_verified_at)
        VALUES (?, ?, ?, ?)
      `).run(customerId, hasMembership, segmentIds, lastVerified);

      // Retrieve
      const result = db.prepare(`
        SELECT * FROM membership_cache WHERE customer_id = ?
      `).get(customerId);

      expect(result).toBeDefined();
      expect(result.customer_id).toBe(customerId);
      expect(result.has_membership).toBe(hasMembership);
      expect(result.segment_ids).toBe(segmentIds);
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

