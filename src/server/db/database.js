const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Get the database path
 * In Electron, use userData directory; otherwise use current directory
 */
function getDatabasePath() {
  // Try to get Electron app if available
  let electronApp;
  try {
    electronApp = require('electron')?.app;
  } catch (e) {
    // Not in Electron environment
  }
  
  if (electronApp && electronApp.getPath) {
    // Electron environment
    const userDataPath = electronApp.getPath('userData');
    return path.join(userDataPath, 'checkin.db');
  } else {
    // Node.js environment (development/testing)
    return path.join(process.cwd(), 'checkin.db');
  }
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
    `);
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

