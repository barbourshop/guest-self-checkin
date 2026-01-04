const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Create an in-memory SQLite database for testing
 * @returns {Database} SQLite database instance
 */
function createTestDatabase() {
  const db = new Database(':memory:');
  
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

