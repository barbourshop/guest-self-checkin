const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Get the database path
 * In Electron, use userData directory; otherwise use current directory
 * For tests, use a separate test database file
 */
function getDatabasePath() {
  // Try to get Electron app if available
  if (process.env.ELECTRON_USER_DATA) {
    return path.join(process.env.ELECTRON_USER_DATA, 'checkin.db');
  }
  
  // Use explicit database path if provided
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  
  // Test environment: use separate test database
  if (process.env.NODE_ENV === 'test' || process.env.USE_TEST_DB === 'true') {
    return path.join(process.cwd(), 'checkin.test.db');
  }
  
  // Default: production/development database
  return path.join(process.cwd(), 'checkin.db');
}

/**
 * Initialize database connection
 * @param {string} dbPath - Optional database path (uses default if not provided)
 * @returns {Database} SQLite database instance
 */
function initDatabase(dbPath = null) {
  const databasePath = dbPath || getDatabasePath();
  
  // Ensure directory exists
  const dir = path.dirname(databasePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const db = new Database(databasePath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  } else {
    // Fallback: create tables directly
    db.exec(`
      CREATE TABLE IF NOT EXISTS customer_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        segment_id TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS membership_cache (
        customer_id TEXT PRIMARY KEY,
        has_membership INTEGER NOT NULL,
        segment_ids TEXT,
        last_verified_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS checkin_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        guest_count INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        synced_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS checkin_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT NOT NULL,
        order_id TEXT,
        guest_count INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        synced_to_square INTEGER NOT NULL DEFAULT 0,
        checkin_type TEXT NOT NULL DEFAULT 'member'
      );
      
      CREATE INDEX IF NOT EXISTS idx_customer_segments_sort ON customer_segments(sort_order);
      CREATE INDEX IF NOT EXISTS idx_membership_cache_last_verified ON membership_cache(last_verified_at);
      CREATE INDEX IF NOT EXISTS idx_checkin_queue_status ON checkin_queue(status);
      CREATE INDEX IF NOT EXISTS idx_checkin_queue_created_at ON checkin_queue(created_at);
      CREATE INDEX IF NOT EXISTS idx_checkin_log_timestamp ON checkin_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_checkin_log_customer_id ON checkin_log(customer_id);
      CREATE INDEX IF NOT EXISTS idx_checkin_log_order_id ON checkin_log(order_id);
      
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  // Migration: add enrichment columns to membership_cache if they don't exist
  const membershipCacheColumns = db.prepare('PRAGMA table_info(membership_cache)').all().map(r => r.name);
  const enrichmentColumns = [
    'given_name', 'family_name', 'email_address', 'phone_number', 'reference_id',
    'address_line_1', 'locality', 'postal_code'
  ];
  for (const col of enrichmentColumns) {
    if (!membershipCacheColumns.includes(col)) {
      try {
        db.prepare(`ALTER TABLE membership_cache ADD COLUMN ${col} TEXT`).run();
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    }
  }

  // Migration: add checkin_type to checkin_log if not present
  const checkinLogColumns = db.prepare('PRAGMA table_info(checkin_log)').all().map(r => r.name);
  if (!checkinLogColumns.includes('checkin_type')) {
    try {
      db.prepare(`ALTER TABLE checkin_log ADD COLUMN checkin_type TEXT NOT NULL DEFAULT 'member'`).run();
    } catch (e) {
      if (!/duplicate column name/i.test(e.message)) throw e;
    }
  }

  return db;
}

/**
 * Close database connection
 */
function closeDatabase(db) {
  if (db) {
    db.close();
  }
}

module.exports = {
  initDatabase,
  closeDatabase,
  getDatabasePath
};

