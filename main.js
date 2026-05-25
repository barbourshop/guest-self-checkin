const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');

const TOKEN_FILENAME = 'square-access-token.txt';

const STARTING_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Front Desk App</title>
  <style>
    html, body { height: 100%; margin: 0; }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 1.25rem;
      color: #333;
      background: #fff;
    }
  </style>
</head>
<body>Starting Front Desk App</body>
</html>`;

// Enhanced console logging
console.log('Starting main process...');
console.log('Current working directory:', process.cwd());
console.log('App data path:', app.getPath('userData'));

// Set up logging
const logDir = path.join(app.getPath('userData'), 'logs');
const logFile = path.join(logDir, 'app.log');

console.log('Log directory:', logDir);
console.log('Log file:', logFile);

// Ensure log directory exists
try {
  if (!fs.existsSync(logDir)) {
    console.log('Creating log directory...');
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  console.error('Failed to create log directory:', err);
}

// Create write stream
let logStream;
try {
  console.log('Creating log stream...');
  logStream = fs.createWriteStream(logFile, { flags: 'a' });
} catch (err) {
  console.error('Failed to create log stream:', err);
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message); // Always log to console
  if (logStream && !logStream.destroyed && !logStream.writableEnded) {
    try {
      logStream.write(logMessage);
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }
}

log('Main process starting...');
log(`Log file: ${logFile}`);
log(`Process ID: ${process.pid}`);

function getTokenFilePath() {
  return path.join(app.getPath('userData'), TOKEN_FILENAME);
}

function readStoredAccessToken() {
  try {
    const p = getTokenFilePath();
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8').trim();
    }
  } catch (err) {
    log(`Could not read stored token: ${err.message}`);
  }
  return '';
}

/** Optional: token pre-placed in resources/.env (e.g. imaging). */
function readTokenFromBundledEnv() {
  try {
    const envPath = path.join(process.resourcesPath, '.env');
    if (!fs.existsSync(envPath)) return '';
    const text = fs.readFileSync(envPath, 'utf8');
    const m = text.match(/^\s*SQUARE_ACCESS_TOKEN\s*=\s*(.*)$/m);
    if (!m) return '';
    return m[1].trim().replace(/^["']|["']$/g, '');
  } catch (err) {
    return '';
  }
}

function getEffectiveAccessToken() {
  return (
    readStoredAccessToken() ||
    readTokenFromBundledEnv() ||
    String(process.env.SQUARE_ACCESS_TOKEN || '').trim()
  );
}

function showAccessTokenSetup() {
  return new Promise((resolve, reject) => {
    let finished = false;
    const win = new BrowserWindow({
      width: 520,
      height: 340,
      show: true,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const finishOk = () => {
      if (finished) return;
      finished = true;
      if (!win.isDestroyed()) win.close();
      resolve();
    };

    const finishCancel = () => {
      if (finished) return;
      finished = true;
      reject(new Error('Square access token was not provided.'));
    };

    win.on('closed', () => {
      if (finished) return;
      finishCancel();
    });

    ipcMain.once('square-access-token-saved', (event, raw) => {
      const token = String(raw || '').trim();
      if (!token) {
        dialog.showMessageBox(win, {
          type: 'warning',
          title: 'Front Desk App',
          message: 'Paste your Square access token, then click Continue again.'
        });
        return;
      }
      try {
        fs.writeFileSync(getTokenFilePath(), token, { encoding: 'utf8' });
        log('Square access token saved.');
        finishOk();
      } catch (err) {
        log(`Failed to save token: ${err.message}`);
        dialog.showErrorBox('Could not save', err.message);
      }
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Front Desk App — Setup</title>
</head>
<body style="font-family:system-ui,sans-serif;margin:24px;line-height:1.4">
  <h1 style="font-size:1.25rem;margin:0 0 8px">Welcome</h1>
  <p style="margin:0 0 16px;color:#444">
    Paste your <strong>Square access token</strong> (from the Square Developer Dashboard or your administrator). This is saved only on this computer.
  </p>
  <label for="t" style="display:block;font-size:0.85rem;margin-bottom:6px">Access token</label>
  <input id="t" type="password" autocomplete="off" style="width:100%;box-sizing:border-box;padding:10px;font-size:14px;border:1px solid #ccc;border-radius:6px" />
  <button id="b" type="button" style="margin-top:18px;padding:10px 20px;font-size:14px;border-radius:6px;border:none;background:#0d6efd;color:#fff;cursor:pointer">Continue</button>
  <script>
    const { ipcRenderer } = require('electron');
    document.getElementById('b').onclick = () => {
      ipcRenderer.send('square-access-token-saved', document.getElementById('t').value);
    };
    document.getElementById('t').focus();
  </script>
</body>
</html>`;

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  });
}

let mainWindow = null;
let expressProcess = null;

function detachServerProcessLogging() {
  if (!expressProcess) return;
  try {
    if (expressProcess.stdout) expressProcess.stdout.removeAllListeners('data');
    if (expressProcess.stderr) expressProcess.stderr.removeAllListeners('data');
  } catch (_) {
    /* ignore */
  }
}

function createWindow() {
  log('Creating window...');
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow
    .loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(STARTING_PAGE_HTML))
    .catch((err) => log(`Error loading starting page: ${err.message}`));

  // Add loading and error event handlers
  mainWindow.webContents.on('did-start-loading', () => {
    log('Window started loading content');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('Window finished loading content');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`Window failed to load: ${errorDescription} (${errorCode})`);
  });

  if (
    process.env.NODE_ENV === 'development' ||
    process.env.ELECTRON_OPEN_DEVTOOLS === '1' ||
    process.env.ELECTRON_OPEN_DEVTOOLS === 'true'
  ) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    log('Window closed');
    mainWindow = null;
  });

  mainWindow.setMenuBarVisibility(false); // Hides the menu bar
  mainWindow.maximize(); // Opens the window maximized

  return mainWindow;
}

/**
 * Stop any process already listening on our API port (orphaned dev server, crashed child, etc.).
 * On macOS, IPv4 and IPv6 can each have a different listener on the same port number, which
 * breaks health checks to 127.0.0.1 when only the new server bound on ::1.
 */
function releaseApiPort(port) {
  const myPid = process.pid;
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (!line.includes('LISTENING')) continue;
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (pid > 0 && pid !== myPid) pids.add(pid);
      }
      for (const pid of pids) {
        log(`Releasing port ${port}: stopping PID ${pid}`);
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        } catch (_) {
          /* ignore */
        }
      }
      return;
    }

    const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).trim();
    if (!out) return;
    for (const pidStr of out.split(/\s+/)) {
      const pid = Number(pidStr);
      if (!pid || pid === myPid) continue;
      log(`Releasing port ${port}: stopping PID ${pid}`);
      try {
        process.kill(pid, 'SIGTERM');
      } catch (_) {
        /* ignore */
      }
    }
  } catch (_) {
    /* nothing listening */
  }
}

function startServer() {
  log('Starting server...');
  const isDev = !app.isPackaged;
  releaseApiPort(3000);
  const serverPath = isDev
    ? './src/server/server.js'
    : path.join(process.resourcesPath, 'src/server/server.js');

  if (!fs.existsSync(serverPath)) {
    log(`ERROR: Server file not found at ${serverPath}`);
    return Promise.reject(new Error(`Server file not found at ${serverPath}`));
  }

  const token = getEffectiveAccessToken();
  const serverEnv = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    ELECTRON_RUN_AS_NODE: '1',
    ELECTRON_USER_DATA: app.getPath('userData'),
    LOG_FILE: logFile,
    RESOURCES_PATH: process.resourcesPath,
    APP_PATH: app.getAppPath(),
    CHECKIN_LOG_DIR: path.join(app.getPath('userData'), 'logs')
  };
  if (token) {
    serverEnv.SQUARE_ACCESS_TOKEN = token;
  }

  // Packaged app: dependencies live under app.asar.unpacked (per-arch / universal merge).
  // Do not rely on resources/node_modules from extraResources — a single host copy breaks
  // Rosetta x64 vs arm64 native modules (e.g. better-sqlite3).
  if (!isDev) {
    const unpackedNodeModules = path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules'
    );
    const legacyNodeModules = path.join(process.resourcesPath, 'node_modules');
    const nodePathParts = [];
    if (fs.existsSync(unpackedNodeModules)) nodePathParts.push(unpackedNodeModules);
    if (fs.existsSync(legacyNodeModules)) nodePathParts.push(legacyNodeModules);
    if (nodePathParts.length) {
      const prefix = nodePathParts.join(path.delimiter);
      serverEnv.NODE_PATH = serverEnv.NODE_PATH
        ? `${prefix}${path.delimiter}${serverEnv.NODE_PATH}`
        : prefix;
    }
  }

  log('Spawning server process...');
  expressProcess = spawn(process.execPath, [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: serverEnv,
    cwd: isDev ? process.cwd() : process.resourcesPath
  });

  // Log server stdout and stderr
  if (expressProcess.stdout) {
    expressProcess.stdout.on('data', (data) => {
      log(`[server stdout] ${data}`);
    });
  }
  if (expressProcess.stderr) {
    expressProcess.stderr.on('data', (data) => {
      log(`[server stderr] ${data}`);
    });
  }
  expressProcess.on('error', (err) => {
    log(`[server spawn error] ${err.message}`);
  });
  expressProcess.on('exit', (code, signal) => {
    log(`[server exit] code=${code} signal=${signal}`);
  });

  return Promise.resolve({ port: 3000, pid: expressProcess.pid });
}

const HEALTH_REQUEST_MS = 2500;

function parseHealthPid(body) {
  try {
    const data = JSON.parse(body);
    return typeof data.pid === 'number' ? data.pid : null;
  } catch {
    return null;
  }
}

/**
 * Poll /api/health until our child server responds (matching PID).
 * Ignores stale listeners on the same port from a previous run or dev "npm run server".
 */
function waitForServer(port, expectedPid, timeout = 30000) {
  const start = Date.now();
  const healthPath = '/api/health';

  return new Promise((resolve, reject) => {
    function scheduleRetry() {
      if (Date.now() - start > timeout) {
        reject(
          new Error(
            `Server did not become ready on http://127.0.0.1:${port}${healthPath} (expected pid ${expectedPid})`
          )
        );
        return;
      }
      setTimeout(check, 250);
    }

    function check() {
      const req = http.get({ hostname: '127.0.0.1', port, path: healthPath, family: 4 }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          const healthPid = parseHealthPid(body);
          log(`Server health: HTTP ${res.statusCode} ${body.slice(0, 200)}`);
          if (res.statusCode >= 200 && res.statusCode < 300 && healthPid === expectedPid) {
            resolve();
            return;
          }
          if (res.statusCode >= 200 && res.statusCode < 300 && healthPid != null && healthPid !== expectedPid) {
            log(
              `Ignoring stale server on port ${port} (health pid ${healthPid}, expected ${expectedPid})`
            );
          }
          scheduleRetry();
        });
      });

      req.setTimeout(HEALTH_REQUEST_MS, () => {
        req.destroy();
        scheduleRetry();
      });

      req.on('error', () => {
        scheduleRetry();
      });
    }

    check();
  });
}

function showStartupError(win, message) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Front Desk App</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; color: #333; }
    h1 { font-size: 1.25rem; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 8px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>Could not start Front Desk App</h1>
  <p>The check-in server did not start correctly. Try closing the app fully and opening it again.</p>
  <pre>${message.replace(/</g, '&lt;')}</pre>
  <p>Details are also in <strong>logs/app.log</strong> under your Front Desk App data folder.</p>
</body>
</html>`;
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html)).catch(() => {});
}

async function loadApplicationUrl(win, url, attempts = 5) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await win.loadURL(url);
      return;
    } catch (err) {
      log(`Error loading application (attempt ${i + 1}/${attempts}): ${err.message}`);
      if (i === attempts - 1) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
}

app.whenReady().then(async () => {
  log('Starting application...');
  try {
    if (app.isPackaged && !getEffectiveAccessToken()) {
      await showAccessTokenSetup();
    }
  } catch (err) {
    log(`Setup aborted: ${err.message}`);
    app.quit();
    return;
  }

  const window = createWindow();
  startServer()
    .then(({ port, pid }) => waitForServer(port, pid).then(() => port))
    .then(async (port) => {
      const url = `http://localhost:${port}`;
      log(`Loading application at ${url}`);
      await loadApplicationUrl(window, url);
    })
    .catch((err) => {
      log(`Could not load app UI: ${err.message}`);
      showStartupError(window, err.message);
    });
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (expressProcess) {
    expressProcess.kill();
  }
  app.quit();
});

app.on('quit', () => {
  detachServerProcessLogging();
  log('App quitting');
  if (expressProcess) {
    expressProcess.kill();
  }
  if (logStream && !logStream.destroyed) {
    logStream.end();
  }
});
