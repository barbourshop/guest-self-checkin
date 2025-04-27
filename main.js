const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
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
let serverPort = 3000;

async function findAvailablePort(startPort) {
  let port = startPort;
  while (port < startPort + 100) { // Try up to 100 ports
    try {
      // Try to kill any process using this port
      if (process.platform === 'win32') {
        await execAsync(`netstat -ano | findstr :${port}`);
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const pid = stdout.split('\n')[0].split(/\s+/)[5];
        if (pid) await execAsync(`taskkill /F /PID ${pid}`);
      } else {
        await execAsync(`lsof -i :${port} -t`);
        const { stdout } = await execAsync(`lsof -i :${port} -t`);
        const pid = stdout.trim();
        if (pid) await execAsync(`kill -9 ${pid}`);
      }
    } catch (err) {
      // If we get here, the port is available
      return port;
    }
    port++;
  }
  throw new Error('No available ports found');
}

function startServer() {
  // Determine if we're in development or production
  const isDev = !app.isPackaged;
  log(`Starting server in ${isDev ? 'development' : 'production'} mode`);
  
  // Get the correct path to the server file
  const serverPath = isDev 
    ? './src/server/server.js'
    : path.join(process.resourcesPath, 'src/server/server.js');

  log(`Server path: ${serverPath}`);

  // Verify server file exists
  if (!fs.existsSync(serverPath)) {
    const error = `Server file not found at: ${serverPath}`;
    log(error);
    throw new Error(error);
  }

  // Set up environment variables
  const env = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    ELECTRON_RUN_AS_NODE: '1'
  };

  // In production, add the node_modules path
  if (!isDev) {
    const nodeModulesPath = path.join(process.resourcesPath, 'node_modules');
    log(`Setting NODE_PATH to: ${nodeModulesPath}`);
    env.NODE_PATH = nodeModulesPath;
    // Also set the working directory to the resources path
    env.PWD = process.resourcesPath;
  }

  // Start the Express server
  try {
    log('Spawning server process...');
    const options = {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env,
      cwd: isDev ? process.cwd() : process.resourcesPath
    };
    
    log(`Starting server with options: ${JSON.stringify(options, null, 2)}`);
    expressProcess = spawn(process.execPath, [serverPath], options);

    // Log server output
    expressProcess.stdout.on('data', (data) => {
      log(`Server stdout: ${data.toString()}`);
    });

    expressProcess.stderr.on('data', (data) => {
      log(`Server stderr: ${data.toString()}`);
    });

    log('Express server process started');

    // Handle server process errors
    expressProcess.on('error', (err) => {
      log(`Failed to start Express server: ${err.message}`);
    });

    expressProcess.on('exit', (code, signal) => {
      log(`Express server exited with code ${code}${signal ? `, signal: ${signal}` : ''}`);
      if (code !== 0) {
        log('Server exited with error code, attempting to restart...');
        setTimeout(() => startServer(), 1000);
      }
    });

    return expressProcess;
  } catch (err) {
    log(`Error starting server: ${err.message}`);
    throw err;
  }
}

function waitForPortFile() {
  return new Promise((resolve) => {
    const checkFile = () => {
      try {
        const portFilePath = process.env.NODE_ENV === 'production'
          ? path.join(process.resourcesPath, 'server-port.txt')
          : 'server-port.txt';
          
        if (fs.existsSync(portFilePath)) {
          const port = parseInt(fs.readFileSync(portFilePath, 'utf8'));
          console.log(`Server port found: ${port}`);
          resolve(port);
        } else {
          setTimeout(checkFile, 500);
        }
      } catch (err) {
        console.error('Error reading port file:', err);
        setTimeout(checkFile, 500);
      }
    };
    checkFile();
  });
}

async function createWindow() {
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
    show: true // Changed to true to show window immediately
  });

  // Open DevTools by default in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Determine if we're in development or production
  const isDev = !app.isPackaged;
  log(`Running in ${isDev ? 'development' : 'production'} mode`);
  
  try {
    // Start server
    log('Starting server...');
    startServer();

    // Wait for the server to write its port
    log('Waiting for server port...');
    serverPort = await waitForPortFile();
    log(`Using port ${serverPort} for server`);

    // Wait a moment for the server to start, then load the app
    setTimeout(() => {
      log('Loading app...');
      const url = `http://localhost:${serverPort}`;
      log(`Attempting to load URL: ${url}`);
      
      mainWindow.loadURL(url)
        .then(() => {
          log('App loaded successfully');
          mainWindow.show();
        })
        .catch(err => {
          log(`Failed to load from server: ${err.message}`);
          const fallbackPath = path.join(__dirname, 'dist', 'index.html');
          log(`Attempting to load fallback file: ${fallbackPath}`);
          mainWindow.loadFile(fallbackPath)
            .then(() => {
              log('Fallback file loaded successfully');
              mainWindow.show();
            })
            .catch(fallbackErr => {
              log(`Failed to load fallback file: ${fallbackErr.message}`);
            });
        });
    }, 1000);
  } catch (err) {
    log(`Failed to start server: ${err.message}`);
    const fallbackPath = path.join(__dirname, 'dist', 'index.html');
    log(`Attempting to load fallback file: ${fallbackPath}`);
    mainWindow.loadFile(fallbackPath)
      .then(() => {
        log('Fallback file loaded successfully');
        mainWindow.show();
      })
      .catch(fallbackErr => {
        log(`Failed to load fallback file: ${fallbackErr.message}`);
      });
  }

  mainWindow.on('closed', function () {
    log('Main window closed');
    mainWindow = null;
  });

  // Add error handling for the window
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`Failed to load: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.webContents.on('crashed', () => {
    log('Window crashed');
  });
}

async function checkForStaleProcesses() {
  try {
    log('Checking for stale processes...');
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq Rec Center Check-in.exe"');
    const processes = stdout.split('\n')
      .filter(line => line.includes('Rec Center Check-in.exe'))
      .map(line => {
        const parts = line.trim().split(/\s+/);
        return parts[1]; // PID is the second column
      })
      .filter(pid => pid && !isNaN(pid)); // Ensure we have a valid numeric PID

    if (processes.length > 1) {
      log(`Found ${processes.length} instances of the application running`);
      for (const pid of processes) {
        if (pid !== process.pid.toString()) {
          log(`Killing stale process with PID: ${pid}`);
          try {
            await execAsync(`taskkill /F /PID ${pid}`);
          } catch (killErr) {
            log(`Failed to kill process ${pid}: ${killErr.message}`);
          }
        }
      }
    }
  } catch (err) {
    log(`Error checking for stale processes: ${err.message}`);
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log('Another instance is running, attempting to focus existing window...');
  // Try to focus the existing window instead of quitting
  app.quit();
} else {
  log('First instance, proceeding with initialization...');
  
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    log('Second instance attempted, focusing existing window...');
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        log('Restoring minimized window...');
        mainWindow.restore();
      }
      log('Focusing window...');
      mainWindow.focus();
    } else {
      log('No main window found, creating new window...');
      createWindow();
    }
  });

  // Handle app ready event
  app.on('ready', async () => {
    log('App ready event received');
    try {
      await checkForStaleProcesses();
      createWindow();
    } catch (err) {
      log(`Error during initialization: ${err.message}`);
    }
  });

  // Handle app activation (macOS)
  app.on('activate', () => {
    log('App activate event received');
    if (mainWindow === null) {
      createWindow();
    }
  });
}

// Event handlers
app.on('window-all-closed', () => {
  log('All windows closed event received');
  if (expressProcess) {
    expressProcess.kill();
    log('Express server stopped');
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('quit', () => {
  log('App quit event received');
  if (expressProcess) {
    expressProcess.kill();
    log('Express server stopped');
  }
  logStream.end();
  
  // Clean up port file
  try {
    if (fs.existsSync('server-port.txt')) {
      fs.unlinkSync('server-port.txt');
    }
  } catch (err) {
    console.error('Error cleaning up port file:', err);
  }
});