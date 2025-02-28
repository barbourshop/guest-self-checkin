const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
let mainWindow;
let expressProcess;

function createWindow() {
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

  // Start the Express server
  expressProcess = spawn('node', ['./src/server/server.js'], { 
    stdio: 'inherit'
  });
  
  console.log('Express server started');

  // Wait a moment for the server to start
  setTimeout(() => {
    // Load the app from localhost (your Express server)
    mainWindow.loadURL('http://localhost:3000');
    
    // Open DevTools during development (remove in production)
    // mainWindow.webContents.openDevTools();
  }, 2000);

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