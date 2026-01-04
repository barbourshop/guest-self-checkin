#!/usr/bin/env node

/**
 * Initialize demo mode by clearing and seeding the demo database
 * This ensures repeatable demo results
 */

const { seedDatabase } = require('./seedDemoData');
const { initDatabase, closeDatabase } = require('../db/database');
const path = require('path');
const fs = require('fs');

// Set environment to use demo database
process.env.USE_DEMO_DB = 'true';

function clearDemoDatabase() {
  console.log('Clearing demo database...');
  const db = initDatabase();
  
  try {
    db.exec(`
      DELETE FROM membership_cache;
      DELETE FROM checkin_queue;
      DELETE FROM checkin_log;
    `);
    console.log('Demo database cleared.');
  } catch (error) {
    console.error('Error clearing demo database:', error);
    throw error;
  } finally {
    closeDatabase(db);
  }
}

function initDemoMode() {
  console.log('Initializing demo mode...');
  console.log('This will clear and reseed the demo database for repeatable results.');
  
  try {
    clearDemoDatabase();
    seedDatabase();
    console.log('\n✅ Demo mode initialized successfully!');
    console.log('You can now start the server with:');
    console.log('  USE_DEMO_DB=true USE_MOCK_SQUARE_SERVICE=true npm run server');
  } catch (error) {
    console.error('\n❌ Failed to initialize demo mode:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initDemoMode();
}

module.exports = { initDemoMode, clearDemoDatabase };

