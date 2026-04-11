#!/usr/bin/env node

/**
 * Post-pack sanity check: ensure electron-builder output contains the
 * bundled frontend (adapter-static) and server under Resources.
 *
 * Usage:
 *   node src/server/scripts/verifyElectronPack.js [path-to-builder-output]
 *   node src/server/scripts/verifyElectronPack.js --resources <path-to-Resources-folder>
 *
 * Default output dir: <repo>/dist (same as package.json build.directories.output).
 * Use --resources after a silent NSIS install to confirm the same layout on disk
 * (e.g. .../Front Desk App/resources next to the .exe).
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const defaultOutDir = path.join(projectRoot, 'dist');

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** @returns {string[]} */
function discoverResourcesRoots(base) {
  const roots = [];
  const win = path.join(base, 'win-unpacked', 'resources');
  const linux = path.join(base, 'linux-unpacked', 'resources');
  if (isDir(win)) roots.push(win);
  if (isDir(linux)) roots.push(linux);

  if (!isDir(base)) return roots;

  for (const ent of fs.readdirSync(base, { withFileTypes: true })) {
    if (!ent.isDirectory() || !ent.name.startsWith('mac')) continue;
    const macDir = path.join(base, ent.name);
    for (const appEnt of fs.readdirSync(macDir, { withFileTypes: true })) {
      if (!appEnt.isDirectory() || !appEnt.name.endsWith('.app')) continue;
      const res = path.join(macDir, appEnt.name, 'Contents', 'Resources');
      if (isDir(res)) roots.push(res);
    }
  }

  return roots;
}

function verifyResourcesRoot(root) {
  const required = [
    ['server', path.join(root, 'src', 'server', 'server.js'), isFile],
    ['client assets dir', path.join(root, 'dist', '_app'), isDir]
  ];

  const spaEntry =
    (isFile(path.join(root, 'dist', 'index.html')) && 'index.html') ||
    (isFile(path.join(root, 'dist', '200.html')) && '200.html') ||
    null;

  const errors = [];
  for (const [label, p, check] of required) {
    if (!check(p)) errors.push(`missing ${label}: ${p}`);
  }
  if (!spaEntry) {
    errors.push(
      `missing SPA entry: expected dist/index.html or dist/200.html under ${root}`
    );
  }

  const asar = path.join(root, 'app.asar');
  if (!isFile(asar)) {
    errors.push(`missing main bundle: ${asar}`);
  }

  return { ok: errors.length === 0, errors, spaEntry };
}

function logInspectResult(root, result) {
  const { ok, errors, spaEntry } = result;
  console.log(`[verify-electron-pack] inspecting: ${root}`);
  if (spaEntry) {
    console.log(`[verify-electron-pack]   SPA entry: dist/${spaEntry}`);
  }
  if (ok) {
    console.log('[verify-electron-pack]   structure OK');
  } else {
    for (const line of errors) console.error(`[verify-electron-pack]   ERROR: ${line}`);
  }
  return ok;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const ri = args.indexOf('--resources');
  if (ri !== -1) {
    const root = args[ri + 1];
    if (!root) {
      console.error('[verify-electron-pack] Missing path after --resources');
      process.exit(1);
    }
    return { mode: 'resources', resourcesRoot: path.resolve(root) };
  }
  const positional = args.find(a => !a.startsWith('--'));
  return { mode: 'outDir', outDir: path.resolve(positional || defaultOutDir) };
}

function main() {
  const parsed = parseArgs();

  if (parsed.mode === 'resources') {
    const root = parsed.resourcesRoot;
    console.log(`[verify-electron-pack] explicit resources directory: ${root}`);
    if (!isDir(root)) {
      console.error(`[verify-electron-pack] Not a directory: ${root}`);
      process.exit(1);
    }
    const result = verifyResourcesRoot(root);
    logInspectResult(root, result);
    if (!result.ok) {
      console.error('[verify-electron-pack] FAILED');
      process.exit(1);
    }
    console.log('[verify-electron-pack] PASSED');
    return;
  }

  const outDir = parsed.outDir;
  console.log(`[verify-electron-pack] output directory: ${outDir}`);

  const roots = discoverResourcesRoots(outDir);
  if (roots.length === 0) {
    console.error(
      '[verify-electron-pack] No unpacked app found. Expected one of:\n' +
        `  ${path.join(outDir, 'win-unpacked', 'resources')}\n` +
        `  ${path.join(outDir, 'linux-unpacked', 'resources')}\n` +
        `  ${path.join(outDir, 'mac*/<Product>.app/Contents/Resources')}\n` +
        'Run electron-builder first (e.g. npm run pack or npm run dist).'
    );
    process.exit(1);
  }

  let failed = false;
  for (const root of roots) {
    const result = verifyResourcesRoot(root);
    if (!logInspectResult(root, result)) failed = true;
  }

  if (failed) {
    console.error('[verify-electron-pack] FAILED');
    process.exit(1);
  }
  console.log('[verify-electron-pack] PASSED');
}

main();
