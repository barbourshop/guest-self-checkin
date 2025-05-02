const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

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

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    log('Window closed');
    mainWindow = null;
  });

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

  const serverEnv = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    ELECTRON_RUN_AS_NODE: '1',
    LOG_FILE: logFile,
    RESOURCES_PATH: process.resourcesPath,
    APP_PATH: app.getAppPath()
  };

  log('Spawning server process...');
  expressProcess = spawn(process.execPath, [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: serverEnv,
    cwd: isDev ? process.cwd() : process.resourcesPath
  });

  return new Promise((resolve, reject) => {
    let serverOutput = '';

    expressProcess.stdout.on('data', (data) => {
      const message = data.toString();
      serverOutput += message;
      
      // Look for the server running message
      if (message.includes('Server is running on http://localhost:')) {
        const port = parseInt(message.match(/localhost:(\d+)/)[1]);
        log(`Server started on port: ${port}`);
        resolve(port);
      }
    });

    expressProcess.stderr.on('data', (data) => {
      const message = data.toString();
      serverOutput += message;
      log(`Server error: ${message.trim()}`);
    });

    expressProcess.on('error', (err) => {
      log(`Failed to start server: ${err.message}`);
      reject(new Error(`Failed to start server: ${err.message}`));
    });

    expressProcess.on('exit', (code) => {
      if (code !== 0) {
        log(`Server exited with code: ${code}`);
        reject(new Error(`Server process exited with code ${code}`));
      }
    });

    setTimeout(() => {
      if (expressProcess) {
        log('Server startup timed out');
        expressProcess.kill();
        reject(new Error('Server startup timed out'));
      }
    }, 30000);
  });
}

// Create window immediately when app is ready
app.on('ready', () => {
  log('Starting application...');
  const window = createWindow();
  
  startServer().then(port => {
    const url = `http://localhost:${port}`;
    log(`Loading application at ${url}`);
    window.loadURL(url).catch(err => {
      log(`Error loading application: ${err.message}`);
    });
  }).catch(err => {
    log(`Server failed to start: ${err.message}`);
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