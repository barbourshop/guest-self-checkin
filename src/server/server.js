const express = require('express');
const path = require('path');
const fs = require('fs');

// Set up logging
const logFile = process.env.LOG_FILE || path.join(process.cwd(), 'server.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [Server] ${message}\n`;
  console.log(message);
  logStream.write(logMessage);
}

log('Server process starting...');
log(`Log file: ${logFile}`);
log(`Current working directory: ${process.cwd()}`);
log(`__dirname: ${__dirname}`);

// Set up module resolution for production
if (process.env.NODE_ENV === 'production') {
  const appPath = process.resourcesPath;
  const nodeModulesPath = path.join(appPath, 'node_modules');
  
  log('Production mode detected');
  log(`App path: ${appPath}`);
  log(`Node modules path: ${nodeModulesPath}`);
  
  // Add node_modules to the module paths
  require('module')._nodeModulePaths = function(from) {
    return [nodeModulesPath];
  };
}

const app = express();
const port = process.env.PORT || 3000;

// Log all requests
app.use((req, res, next) => {
  log(`Request: ${req.method} ${req.url}`);
  next();
});

// Determine the correct path for static files
let staticPath;
if (process.env.NODE_ENV === 'production') {
  // In production, we need to go up from the resources directory to the app root
  const appRoot = path.resolve(process.resourcesPath, '..', '..');
  staticPath = path.join(appRoot, 'dist');
  
  // Log all relevant paths for verification
  log('Production Paths:');
  log(`- Resources Path: ${process.resourcesPath}`);
  log(`- App Root: ${appRoot}`);
  log(`- Static Path: ${staticPath}`);
  log(`- Expected index.html: ${path.join(staticPath, 'index.html')}`);
  
  // Verify the paths exist
  log('Path Verification:');
  log(`- Resources directory exists: ${fs.existsSync(process.resourcesPath)}`);
  log(`- App root exists: ${fs.existsSync(appRoot)}`);
  log(`- Static directory exists: ${fs.existsSync(staticPath)}`);
  if (fs.existsSync(staticPath)) {
    log(`- Static directory contents: ${fs.readdirSync(staticPath).join(', ')}`);
  }
} else {
  staticPath = path.join(__dirname, '../../dist');
  log('Development Paths:');
  log(`- Static Path: ${staticPath}`);
  log(`- Expected index.html: ${path.join(staticPath, 'index.html')}`);
  log(`- Static directory exists: ${fs.existsSync(staticPath)}`);
  if (fs.existsSync(staticPath)) {
    log(`- Static directory contents: ${fs.readdirSync(staticPath).join(', ')}`);
  }
}

// Serve static files
app.use(express.static(staticPath));

// Log static file serving errors
app.use((err, req, res, next) => {
  if (err) {
    log(`Static file error: ${err.message}`);
    log(`Requested path: ${req.path}`);
    log(`Full requested path: ${path.join(staticPath, req.path)}`);
  }
  next(err);
});

// API routes
app.get('/api/status', (req, res) => {
  log('Status check received');
  res.json({ status: 'ok' });
});

// Catch-all route for SPA
app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  log(`Serving index.html for path: ${req.path}`);
  log(`Attempting to serve from: ${indexPath}`);
  log(`Index.html exists: ${fs.existsSync(indexPath)}`);
  res.sendFile(indexPath);
});

// Start server
app.listen(port, () => {
  log(`Server is running on http://localhost:${port}`);
  log(`Static files directory exists: ${fs.existsSync(staticPath)}`);
  if (fs.existsSync(staticPath)) {
    log(`Contents of static directory: ${fs.readdirSync(staticPath).join(', ')}`);
  }
  
  // Write the port to a file in the correct location based on environment
  const portFilePath = process.env.NODE_ENV === 'production' 
    ? path.join(process.resourcesPath, 'server-port.txt')
    : 'server-port.txt';
  require('fs').writeFileSync(portFilePath, port.toString());
});

// Handle process termination
process.on('SIGTERM', () => {
  log('Received SIGTERM signal');
  logStream.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT signal');
  logStream.end();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`);
  logStream.end();
  process.exit(1);
});