const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Set up logging
const logDir = path.join(app.getPath('userData'), 'logs');
const logFile = path.join(logDir, 'app.log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create write stream
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  logStream.write(logMessage);
}

log('Main process starting...');
log(`Log file: ${logFile}`);

let mainWindow = null;
let expressProcess = null;

function startServer() {
  log('Starting server...');
  const isDev = !app.isPackaged;
  const serverPath = isDev 
    ? './src/server/server.js'
    : path.join(process.resourcesPath, 'src/server/server.js');

  log(`Server path: ${serverPath}`);

  const env = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    ELECTRON_RUN_AS_NODE: '1',
    LOG_FILE: logFile // Pass log file path to server
  };

  if (!isDev) {
    env.NODE_PATH = path.join(process.resourcesPath, 'node_modules');
    log('Setting NODE_PATH:', env.NODE_PATH);
  }

  expressProcess = spawn(process.execPath, [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: env,
    cwd: isDev ? process.cwd() : process.resourcesPath
  });

  expressProcess.stdout.on('data', (data) => log(`Server: ${data.toString()}`));
  expressProcess.stderr.on('data', (data) => log(`Server error: ${data.toString()}`));

  expressProcess.on('error', (err) => {
    log(`Failed to start server: ${err.message}`);
  });

  expressProcess.on('exit', (code) => {
    log(`Server exited with code: ${code}`);
  });

  return new Promise((resolve) => {
    expressProcess.stdout.on('data', (data) => {
      const output = data.toString();
      log(`Server output: ${output}`);
      if (output.includes('Server is running on')) {
        const port = parseInt(output.match(/localhost:(\d+)/)[1]);
        log(`Server started on port: ${port}`);
        resolve(port);
      }
    });
  });
}

function createWindow() {
  log('Creating window...');
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    log('Window closed');
    mainWindow = null;
  });

  return mainWindow;
}

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  log('Another instance is running, quitting...');
  app.quit();
  return;
}

app.on('ready', async () => {
  log('App ready event received');
  try {
    const port = await startServer();
    const window = createWindow();
    
    log(`Loading app at http://localhost:${port}`);
    await window.loadURL(`http://localhost:${port}`);
    window.show();
    log('Window shown');
  } catch (err) {
    log(`Failed to start app: ${err.message}`);
    app.quit();
  }
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
  logStream.end();
});