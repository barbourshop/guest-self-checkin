const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

const TOKEN_FILENAME = 'square-access-token.txt';

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
  if (logStream) {
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

function createWindow() {
  log('Creating window...');
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

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

function startServer() {
  log('Starting server...');
  const isDev = !app.isPackaged;
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
    LOG_FILE: logFile,
    RESOURCES_PATH: process.resourcesPath,
    APP_PATH: app.getAppPath(),
    CHECKIN_LOG_DIR: path.join(app.getPath('userData'), 'logs')
  };
  if (token) {
    serverEnv.SQUARE_ACCESS_TOKEN = token;
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

  return Promise.resolve(3000);
}

// Wait for the server to be ready before loading the URL
function waitForServer(port, timeout = 15000) {
  const start = Date.now();
  const healthPath = '/api/health';
  return new Promise((resolve, reject) => {
    function check() {
      http
        .get({ hostname: '127.0.0.1', port, path: healthPath }, (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8').slice(0, 200);
            log(`Server health: HTTP ${res.statusCode} ${body}`);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve();
            } else if (Date.now() - start > timeout) {
              reject(new Error(`Server health returned ${res.statusCode}`));
            } else {
              setTimeout(check, 200);
            }
          });
        })
        .on('error', (err) => {
          if (Date.now() - start > timeout) {
            reject(
              new Error(
                `Server did not respond on http://127.0.0.1:${port}${healthPath}: ${err.message}`
              )
            );
          } else {
            setTimeout(check, 200);
          }
        });
    }
    check();
  });
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
    .then((port) => waitForServer(port).then(() => port))
    .then((port) => {
      const url = `http://localhost:${port}`;
      log(`Loading application at ${url}`);
      window.loadURL(url).catch((err) => {
        log(`Error loading application: ${err.message}`);
      });
    })
    .catch((err) => {
      log(`Could not load app UI: ${err.message}`);
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
  log('App quitting');
  if (expressProcess) {
    expressProcess.kill();
  }
  if (logStream) {
    logStream.end();
  }
});
