#!/usr/bin/env node
/**
 * Rebuild better-sqlite3 when the binary was compiled for a different Node ABI
 * (common after switching Node versions or copying node_modules between machines).
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function needsRebuild(error) {
  const message = String(error?.message || error);
  return (
    message.includes('NODE_MODULE_VERSION') ||
    message.includes('was compiled against a different Node.js version') ||
    message.includes('did not self-register')
  );
}

function loadBetterSqlite3() {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  require(path.join(ROOT, 'node_modules', 'better-sqlite3'));
}

function rebuild() {
  console.log(
    `[ensure-native-modules] Rebuilding better-sqlite3 for Node ${process.version}…`
  );
  execSync('npm rebuild better-sqlite3', {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  });
}

try {
  loadBetterSqlite3();
} catch (error) {
  if (!needsRebuild(error)) {
    throw error;
  }
  rebuild();
  loadBetterSqlite3();
}
