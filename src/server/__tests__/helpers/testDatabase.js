const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Create a test SQLite database for testing
 * Uses in-memory database by default, but can use test.db file if needed
 * @param {boolean} useFile - If true, use test.db file instead of in-memory
 * @returns {Database} SQLite database instance
 */
function createTestDatabase(useFile = false) {
  // Ensure we're in test mode
  process.env.NODE_ENV = 'test';
  process.env.USE_TEST_DB = 'true';
  
  let db;
  if (useFile) {
    // Use test database file
    const testDbPath = path.join(process.cwd(), 'checkin.test.db');
    // Delete existing test database if it exists
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (error) {
        // Ignore - might be locked
      }
    }
    db = new Database(testDbPath);
  } else {
    // Use in-memory database (default)
    db = new Database(':memory:');
  }
  
  // Create tables
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
  `);
  
  return db;
}

/**
 * Clean up test database
 */
function closeTestDatabase(db) {
  if (db) {
    db.close();
  }
}

/**
 * Clear all data from test database
 */
function clearTestDatabase(db) {
  if (db) {
    db.exec(`
      DELETE FROM membership_cache;
      DELETE FROM checkin_queue;
      DELETE FROM checkin_log;
    `);
  }
}

module.exports = {
  createTestDatabase,
  closeTestDatabase,
  clearTestDatabase
};

