/**
 * Jest setup file for backend tests
 * Ensures tests use test database and reset it properly
 * This file is loaded before tests run via setupFilesAfterEnv
 */

// Force test database usage
process.env.NODE_ENV = 'test';
process.env.USE_TEST_DB = 'true';

// Clean up test database file if it exists (before all tests)
const path = require('path');
const fs = require('fs');
const testDbPath = path.join(process.cwd(), 'checkin.test.db');

if (fs.existsSync(testDbPath)) {
  try {
    fs.unlinkSync(testDbPath);
  } catch (error) {
    // Ignore errors - file might be locked
  }
}
