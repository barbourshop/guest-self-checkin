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
const staticPath = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'dist')  // Use the app's root dist directory
  : path.join(__dirname, '../../dist');

log(`Serving static files from: ${staticPath}`);
log(`Process cwd: ${process.cwd()}`);
log(`Process resources path: ${process.resourcesPath}`);

// Serve static files
app.use(express.static(staticPath));

// Log static file serving errors
app.use((err, req, res, next) => {
  if (err) {
    log(`Static file error: ${err.message}`);
    log(`Requested path: ${req.path}`);
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
  log(`Serving index.html for path: ${req.path}`);
  res.sendFile(path.join(staticPath, 'index.html'));
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