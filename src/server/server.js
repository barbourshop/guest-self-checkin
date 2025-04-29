const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const customerRoutes = require('./routes/customerRoutes');
const waiverRoutes = require('./routes/waiverRoutes');

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

// Log environment variables (without sensitive data)
log('Environment Configuration:');
log(`- NODE_ENV: ${process.env.NODE_ENV}`);
log(`- SQUARE_API_URL: ${process.env.SQUARE_API_URL ? 'Set' : 'Not Set'}`);
log(`- SQUARE_API_VERSION: ${process.env.SQUARE_API_VERSION ? 'Set' : 'Not Set'}`);
log(`- SQUARE_ENVIRONMENT: ${process.env.SQUARE_ENVIRONMENT ? 'Set' : 'Not Set'}`);
log(`- SQUARE_ACCESS_TOKEN: ${process.env.SQUARE_ACCESS_TOKEN ? 'Set' : 'Not Set'}`);

// Log all non-sensitive environment variables for debugging
log('All Environment Variables:');
Object.keys(process.env).forEach(key => {
  if (!key.toLowerCase().includes('token') && !key.toLowerCase().includes('secret') && !key.toLowerCase().includes('key')) {
    log(`- ${key}: ${process.env[key]}`);
  }
});

// Parse JSON request bodies
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  log(`Request: ${req.method} ${req.url}`);
  next();
});

// API routes - register these BEFORE static file serving
app.use('/api/customers', customerRoutes);
app.use('/api/waivers', waiverRoutes);

app.get('/api/status', (req, res) => {
  log('Status check received');
  res.json({ status: 'ok' });
});

// Determine the correct path for static files
let staticPath;
if (process.env.NODE_ENV === 'production') {
  // In production, we need to handle both unpacked and installed versions
  const appRoot = path.resolve(process.resourcesPath, '..');
  const appAsarPath = path.join(process.resourcesPath, 'app.asar');
  
  // Check if we're in an asar archive
  if (fs.existsSync(appAsarPath)) {
    // We're in the installed version, static files are in app.asar/dist
    staticPath = path.join(appAsarPath, 'dist');
  } else {
    // We're in the unpacked version, static files are in the app root
    staticPath = appRoot;
  }
  
  // Log all relevant paths for verification
  log('Production Paths:');
  log(`- Resources Path: ${process.resourcesPath}`);
  log(`- App Root: ${appRoot}`);
  log(`- App Asar Path: ${appAsarPath}`);
  log(`- Static Path: ${staticPath}`);
  log(`- Expected index.html: ${path.join(staticPath, 'index.html')}`);
  
  // Verify the paths exist
  log('Path Verification:');
  log(`- Resources directory exists: ${fs.existsSync(process.resourcesPath)}`);
  log(`- App root exists: ${fs.existsSync(appRoot)}`);
  log(`- App asar exists: ${fs.existsSync(appAsarPath)}`);
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