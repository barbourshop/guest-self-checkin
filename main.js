const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Set up logging
const logPath = path.join(app.getPath('userData'), 'app.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  logStream.write(logMessage);
}

let mainWindow = null;
let expressProcess = null;

function startServer() {
  const isDev = !app.isPackaged;
  const serverPath = isDev 
    ? './src/server/server.js'
    : path.join(process.resourcesPath, 'src/server/server.js');

  log(`Starting server in ${isDev ? 'development' : 'production'} mode`);
  log(`Server path: ${serverPath}`);

  const env = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    ELECTRON_RUN_AS_NODE: '1'
  };

  if (!isDev) {
    env.NODE_PATH = path.join(process.resourcesPath, 'node_modules');
  }

  expressProcess = spawn(process.execPath, [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: env,
    cwd: isDev ? process.cwd() : process.resourcesPath
  });

  expressProcess.stdout.on('data', (data) => log(`Server: ${data.toString()}`));
  expressProcess.stderr.on('data', (data) => log(`Server error: ${data.toString()}`));

  return new Promise((resolve) => {
    expressProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Server is running on')) {
        const port = parseInt(data.toString().match(/localhost:(\d+)/)[1]);
        resolve(port);
      }
    });
  });
}

function createWindow() {
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

  return mainWindow;
}

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit();
  return;
}

app.on('ready', async () => {
  try {
    log('App starting...');
    const port = await startServer();
    const window = createWindow();
    
    log(`Loading app at http://localhost:${port}`);
    await window.loadURL(`http://localhost:${port}`);
    window.show();
    
    log('App started successfully');
  } catch (err) {
    log(`Failed to start app: ${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (expressProcess) {
    expressProcess.kill();
  }
  app.quit();
});

app.on('quit', () => {
  logStream.end();
});