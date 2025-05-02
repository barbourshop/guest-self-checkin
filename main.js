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

  log('Checking server file existence...');
  if (!fs.existsSync(serverPath)) {
    log(`ERROR: Server file not found at ${serverPath}`);
    return Promise.reject(new Error(`Server file not found at ${serverPath}`));
  }
  log('Server file exists');

  log(`Server path: ${serverPath}`);
  log(`Is development mode: ${isDev}`);
  log(`Current working directory: ${process.cwd()}`);
  log(`Resource path: ${process.resourcesPath}`);
  log(`Node execPath: ${process.execPath}`);

  // Set up server environment
  const serverEnv = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    ELECTRON_RUN_AS_NODE: '1',
    LOG_FILE: logFile,
    RESOURCES_PATH: process.resourcesPath,
    APP_PATH: app.getAppPath(),
    DEBUG: '*'
  };

  // Log non-sensitive environment variables
  log('Environment variables being passed to server:');
  Object.keys(serverEnv).forEach(key => {
    if (!key.toLowerCase().includes('token') && !key.toLowerCase().includes('secret') && !key.toLowerCase().includes('key')) {
      log(`- ${key}: ${serverEnv[key] ? 'Set' : 'Not Set'}`);
    }
  });

  log('Attempting to spawn server process...');
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
      log(`Server stdout: ${message.trim()}`);
      
      // Look for the server running message
      if (message.includes('Server is running on http://localhost:')) {
        const port = parseInt(message.match(/localhost:(\d+)/)[1]);
        log(`Server started successfully on port: ${port}`);
        resolve(port);
      }
    });

    expressProcess.stderr.on('data', (data) => {
      const message = data.toString();
      serverOutput += message;
      log(`Server stderr: ${message.trim()}`);
    });

    expressProcess.on('error', (err) => {
      const errorMessage = `Failed to start server: ${err.message}`;
      log(`Server error: ${errorMessage}`);
      reject(new Error(errorMessage));
    });

    expressProcess.on('exit', (code) => {
      const exitMessage = `Server exited with code: ${code}`;
      log(`Server exit: ${exitMessage}`);
      if (code !== 0) {
        log(`Full server output:\n${serverOutput}`);
        reject(new Error(`Server process exited with code ${code}`));
      }
    });

    // Keep timeout as a safety measure
    setTimeout(() => {
      if (expressProcess) {
        log('Server startup timed out after 30 seconds');
        log(`Last known output:\n${serverOutput}`);
        expressProcess.kill();
        reject(new Error('Server startup timed out after 30 seconds'));
      }
    }, 30000);
  });
}

// Create window immediately when app is ready
app.on('ready', () => {
  log('App ready event received');
  const window = createWindow();
  log('Loading blank page while server starts...');
  window.loadURL('about:blank').catch(err => {
    log(`Error loading blank page: ${err.message}`);
  });
  
  // Start server in background
  startServer().then(port => {
    const url = `http://localhost:${port}`;
    log(`Loading app at ${url}`);
    window.loadURL(url).catch(err => {
      log(`Error loading app URL: ${err.message}`);
      // If we can't load the app, show an error page
      window.loadURL(`data:text/html,Failed to load app: ${err.message}`).catch(err2 => {
        log(`Error showing error page: ${err2.message}`);
      });
    });
  }).catch(err => {
    log(`Failed to start server: ${err.message}`);
    window.loadURL(`data:text/html,Server failed to start: ${err.message}`).catch(err2 => {
      log(`Error showing error page: ${err2.message}`);
    });
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