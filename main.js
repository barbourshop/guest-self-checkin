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

  log(`Server path: ${serverPath}`);
  log(`Is development mode: ${isDev}`);

  const env = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    ELECTRON_RUN_AS_NODE: '1',
    LOG_FILE: logFile
  };

  if (!isDev) {
    env.NODE_PATH = path.join(process.resourcesPath, 'node_modules');
    log('Setting NODE_PATH:', env.NODE_PATH);
  }

  log('Spawning server process...');
  expressProcess = spawn(process.execPath, [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: env,
    cwd: isDev ? process.cwd() : process.resourcesPath,
    detached: true
  });

  expressProcess.stdout.on('data', (data) => {
    const message = data.toString();
    log(`Server stdout: ${message}`);
  });

  expressProcess.stderr.on('data', (data) => {
    const message = data.toString();
    log(`Server stderr: ${message}`);
  });

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