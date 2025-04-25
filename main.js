const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fetch = require('node-fetch');
let mainWindow = null;
let expressProcess = null;

async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000/health');
    return response.ok;
  } catch (err) {
    return false;
  }
}

async function waitForServer(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkServerHealth()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

function createWindow() {
  // Prevent multiple windows
  if (mainWindow) {
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
    // Set app icon (optional - you'll need to create this)
    icon: path.join(__dirname, 'public/icon.ico')
  });

  // Determine if we're in development or production
  const isDev = !app.isPackaged;
  
  // Get the correct path to the server file
  const serverPath = isDev 
    ? './src/server/server.js'
    : path.join(process.resourcesPath, 'src/server/server.js');

  console.log('Starting Express server from path:', serverPath);

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
    console.error('Failed to start Express server:', err);
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  });

  expressProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Express server exited with code ${code}`);
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }
  });
  
  console.log('Express server started with PID:', expressProcess.pid);

  // Wait for server to be ready
  waitForServer().then(serverReady => {
    if (serverReady) {
      console.log('Server is ready, loading app...');
      mainWindow.loadURL('http://localhost:3000')
        .catch(err => {
          console.error('Failed to load from server:', err);
          mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
        });
    } else {
      console.error('Server failed to start, loading static files');
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }
  });
  
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  // Kill the Express process when the app is closed
  if (expressProcess) {
    expressProcess.kill();
    console.log('Express server stopped');
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle app quit
app.on('quit', () => {
  // Ensure Express process is terminated
  if (expressProcess) {
    expressProcess.kill();
    console.log('Express server stopped');
  }
});