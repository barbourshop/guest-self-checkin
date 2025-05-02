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
    ...process.env,  // Start with current environment
    NODE_ENV: isDev ? 'development' : 'production',
    ELECTRON_RUN_AS_NODE: '1',  // Tell Electron to behave like Node
    LOG_FILE: logFile,
    RESOURCES_PATH: process.resourcesPath,
    APP_PATH: app.getAppPath(),
    DEBUG: '*'  // Enable all debug logging
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
    let startupPhase = 'initializing';
    
    expressProcess.stdout.on('data', (data) => {
      const message = data.toString();
      serverOutput += message;
      log(`Server stdout [${startupPhase}]: ${message.trim()}`);
      
      // Track startup phases
      if (message.includes('[INFO] Setting up middleware')) {
        startupPhase = 'middleware';
      } else if (message.includes('[INFO] Setting up routes')) {
        startupPhase = 'routes';
      } else if (message.includes('[INFO] Configuring static file serving')) {
        startupPhase = 'static-files';
      } else if (message.includes('[INFO] Server is running on')) {
        startupPhase = 'running';
        const port = parseInt(message.match(/localhost:(\d+)/)[1]);
        log(`Server started successfully on port: ${port}`);
        resolve(port);
      }
    });

    expressProcess.stderr.on('data', (data) => {
      const message = data.toString();
      serverOutput += message;
      log(`Server stderr [${startupPhase}]: ${message.trim()}`);
    });

    expressProcess.on('error', (err) => {
      const errorMessage = `Failed to start server: ${err.message}`;
      log(`Server error [${startupPhase}]: ${errorMessage}`);
      reject(new Error(errorMessage));
    });

    expressProcess.on('exit', (code) => {
      const exitMessage = `Server exited with code: ${code}`;
      log(`Server exit [${startupPhase}]: ${exitMessage}`);
      if (code !== 0) {
        log(`Full server output:\n${serverOutput}`);
        reject(new Error(`Server process exited with code ${code}`));
      }
    });

    // Add timeout to prevent hanging
    setTimeout(() => {
      if (expressProcess) {
        log(`Server startup timed out in phase: ${startupPhase}`);
        log(`Last known output:\n${serverOutput}`);
        expressProcess.kill();
        reject(new Error(`Server startup timed out in phase: ${startupPhase}`));
      }
    }, 30000);
  });
}

// Create window immediately when app is ready
app.on('ready', () => {
  log('App ready event received');
  const window = createWindow();
  window.loadURL('about:blank'); // Show blank page immediately
  
  // Start server in background
  startServer().then(port => {
    log(`Loading app at http://localhost:${port}`);
    window.loadURL(`http://localhost:${port}`);
  }).catch(err => {
    log(`Failed to start server: ${err.message}`);
    window.loadURL('about:blank');
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