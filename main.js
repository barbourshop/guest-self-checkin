const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fetch = require('node-fetch');
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
let isServerStarting = false;
let serverStartAttempts = 0;
const MAX_SERVER_ATTEMPTS = 3;

async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000/health');
    return response.ok;
  } catch (err) {
    log(`Health check failed: ${err.message}`);
    return false;
  }
}

async function startServer() {
  if (isServerStarting) {
    log('Server is already starting, waiting...');
    return;
  }

  if (serverStartAttempts >= MAX_SERVER_ATTEMPTS) {
    log('Max server start attempts reached');
    return false;
  }

  isServerStarting = true;
  serverStartAttempts++;

  // Determine if we're in development or production
  const isDev = !app.isPackaged;
  
  // Get the correct path to the server file
  const serverPath = isDev 
    ? './src/server/server.js'
    : path.join(process.resourcesPath, 'src/server/server.js');

  log(`Starting Express server from path: ${serverPath}`);

  // Start the Express server
  expressProcess = spawn(process.execPath, [serverPath], { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: isDev ? 'development' : 'production'
    }
  });

  // Handle server process errors
  expressProcess.on('error', (err) => {
    log(`Failed to start Express server: ${err.message}`);
    isServerStarting = false;
  });

  expressProcess.on('exit', (code) => {
    log(`Express server exited with code ${code}`);
    isServerStarting = false;
  });

  // Wait for server to be ready
  for (let i = 0; i < 10; i++) {
    if (await checkServerHealth()) {
      log('Server is ready');
      isServerStarting = false;
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  log('Server failed to start after timeout');
  isServerStarting = false;
  return false;
}

function createWindow() {
  log('createWindow called');
  
  // Prevent multiple windows
  if (mainWindow) {
    log('Window already exists, focusing existing window');
    mainWindow.focus();
    return;
  }

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'public/icon.ico'),
    show: false // Don't show the window until it's ready
  });

  // Determine if we're in development or production
  const isDev = !app.isPackaged;
  log(`Running in ${isDev ? 'development' : 'production'} mode`);
  
  // Start server and load app
  startServer().then(serverReady => {
    if (serverReady) {
      log('Loading app from server...');
      mainWindow.loadURL('http://localhost:3000')
        .then(() => {
          log('App loaded successfully');
          mainWindow.show();
        })
        .catch(err => {
          log(`Failed to load from server: ${err.message}`);
          mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
            .then(() => mainWindow.show());
        });
    } else {
      log('Loading static files...');
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
        .then(() => mainWindow.show());
    }
  });
  
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    log('Main window closed');
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log('Another instance is running, quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('ready', () => {
    log('App ready event received');
    createWindow();
  });
}

app.on('window-all-closed', function () {
  log('All windows closed event received');
  // Kill the Express process when the app is closed
  if (expressProcess) {
    expressProcess.kill();
    log('Express server stopped');
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  log('App activate event received');
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle app quit
app.on('quit', () => {
  log('App quit event received');
  // Ensure Express process is terminated
  if (expressProcess) {
    expressProcess.kill();
    log('Express server stopped');
  }
  logStream.end();
});
});