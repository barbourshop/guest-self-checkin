const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Get the database path
 * In Electron, use userData directory; otherwise use current directory
 * For tests, use a separate test database file
 * For demo data, use a separate demo database file
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
  
  // Demo/development environment: use demo database if specified
  if (process.env.USE_DEMO_DB === 'true') {
    return path.join(process.cwd(), 'checkin.demo.db');
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
      CREATE TABLE IF NOT EXISTS membership_cache (
        customer_id TEXT PRIMARY KEY,
        has_membership INTEGER NOT NULL,
        membership_catalog_item_id TEXT,
        membership_variant_id TEXT,
        membership_order_id TEXT,
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
        synced_to_square INTEGER NOT NULL DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_membership_cache_last_verified ON membership_cache(last_verified_at);
      CREATE INDEX IF NOT EXISTS idx_checkin_queue_status ON checkin_queue(status);
      CREATE INDEX IF NOT EXISTS idx_checkin_queue_created_at ON checkin_queue(created_at);
      CREATE INDEX IF NOT EXISTS idx_checkin_log_timestamp ON checkin_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_checkin_log_customer_id ON checkin_log(customer_id);
      CREATE INDEX IF NOT EXISTS idx_checkin_log_order_id ON checkin_log(order_id);
    `);
  }
  
  // Migrate existing membership_cache table to add membership_order_id column if needed
  // This runs regardless of whether schema.sql exists or not
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(membership_cache)`).all();
    if (tableInfo.length > 0) {
      // Table exists, check if column exists
      const hasOrderIdColumn = tableInfo.some(col => col.name === 'membership_order_id');
      if (!hasOrderIdColumn) {
        db.exec(`ALTER TABLE membership_cache ADD COLUMN membership_order_id TEXT`);
      }
    }
  } catch (error) {
    // Table might not exist yet, which is fine - it will be created with the column
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

