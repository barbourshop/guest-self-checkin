#!/usr/bin/env node

/**
 * Reset local development state: remove database and/or check-in logs
 * so you can test the app from a clean state.
 *
 * Usage:
 *   node src/server/scripts/resetLocalState.js           # remove db + logs
 *   node src/server/scripts/resetLocalState.js --keep-db   # remove only logs (keep db)
 *   node src/server/scripts/resetLocalState.js --keep-logs # remove only db (keep logs)
 *
 * Or:  npm run reset:local        (full reset)
 *      npm run reset:local-keep-db  (clear logs etc., keep database)
 *
 * Removes (from project root):
 *   - checkin.db, checkin.db-shm, checkin.db-wal (unless --keep-db)
 *   - logs/checkins/ (CSV check-in logs), unless --keep-logs
 *
 * Does not remove: checkin.test.db (test DB), node_modules, .env
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const keepLogs = process.argv.includes('--keep-logs');
const keepDb = process.argv.includes('--keep-db');

const dbFiles = [
  path.join(root, 'checkin.db'),
  path.join(root, 'checkin.db-shm'),
  path.join(root, 'checkin.db-wal')
];

const logsDir = path.join(root, 'logs', 'checkins');

function removeIfExists(filePath, label) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Removed: ${label || filePath}`);
      return true;
    }
  } catch (err) {
    console.error(`Failed to remove ${filePath}:`, err.message);
  }
  return false;
}

function removeDirIfExists(dirPath, label) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true });
      console.log(`Removed: ${label || dirPath}`);
      return true;
    }
  } catch (err) {
    console.error(`Failed to remove ${dirPath}:`, err.message);
  }
  return false;
}

console.log('Resetting local state (project root:', root, ')');
if (keepDb) console.log('Keeping database (--keep-db)\n');
else console.log('');

let removed = 0;
if (!keepDb) {
  for (const f of dbFiles) {
    if (removeIfExists(f, path.basename(f))) removed++;
  }
}

if (!keepLogs && removeDirIfExists(logsDir, 'logs/checkins')) {
  removed++;
}

if (removed === 0) {
  console.log('Nothing to remove — already clean.');
} else {
  console.log('\nDone.', keepDb ? 'Database kept; logs cleared.' : 'Start the server and it will create a fresh database and logs.');
}
