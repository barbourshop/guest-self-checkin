#!/usr/bin/env node
/**
 * Verify packaged-app SQLite lives under AppData and is writable (no HTTP).
 * Used by Windows CI smoke test after the app has started once and been stopped.
 *
 * Usage:
 *   node scripts/verify-appdata-db.js
 *   node scripts/verify-appdata-db.js --db "C:\\Users\\...\\AppData\\Roaming\\front-desk-app\\checkin.db"
 *   node scripts/verify-appdata-db.js --resources "C:\\...\\resources"
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function parseArg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

function defaultAppDataDb() {
  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error('APPDATA is not set (Windows only)');
  }
  return path.join(appData, 'front-desk-app', 'checkin.db');
}

const dbPath = parseArg('--db') || defaultAppDataDb();
const resourcesDir = parseArg('--resources');

if (!fs.existsSync(dbPath)) {
  console.error(`[verify-appdata-db] Missing database: ${dbPath}`);
  process.exit(1);
}

if (resourcesDir) {
  const legacyPath = path.join(resourcesDir, 'checkin.db');
  const normalizedDb = path.resolve(dbPath);
  const normalizedLegacy = path.resolve(legacyPath);
  if (normalizedDb === normalizedLegacy) {
    console.error(
      '[verify-appdata-db] Database must not be the install resources copy (use ELECTRON_USER_DATA / AppData)'
    );
    process.exit(1);
  }
  if (fs.existsSync(legacyPath)) {
    console.log(
      `[verify-appdata-db] Legacy resources DB present (OK if AppData is primary): ${legacyPath}`
    );
  }
}

const smokeKey = '__ci_smoke_db_write__';
const smokeValue = `ok-${Date.now()}`;
const updatedAt = new Date().toISOString();

let db;
try {
  db = new Database(dbPath);
  db.prepare('SELECT 1 AS ok').get();

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_config'")
    .all();
  if (tables.length === 0) {
    throw new Error('app_config table missing — schema not initialized');
  }

  db.prepare(
    `INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(smokeKey, smokeValue, updatedAt);

  const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(smokeKey);
  if (!row || row.value !== smokeValue) {
    throw new Error('Read-back failed after write');
  }

  db.prepare('DELETE FROM app_config WHERE key = ?').run(smokeKey);
  console.log(`[verify-appdata-db] Read/write OK: ${dbPath}`);
} catch (err) {
  const msg = err && err.message ? err.message : String(err);
  console.error(`[verify-appdata-db] Failed: ${msg}`);
  if (/readonly|READONLY|CANTOPEN/i.test(msg)) {
    console.error('[verify-appdata-db] This matches the production "readonly database" failure mode.');
  }
  process.exit(1);
} finally {
  if (db) db.close();
}
