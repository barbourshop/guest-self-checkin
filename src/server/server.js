const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const customerRoutes = require('./routes/customerRoutes');
const waiverRoutes = require('./routes/waiverRoutes');
const logger = require('./logger');

// Set up logging
logger.info('Server process starting...');

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('process.resourcesPath:', process.resourcesPath);
// Set up module resolution for production
if (process.env.NODE_ENV === 'production' && typeof process.resourcesPath !== 'undefined') {
  const appPath = process.resourcesPath;
  console.log('appPath:', appPath);
  const nodeModulesPath = path.join(appPath, 'node_modules');
  
  logger.info('Production mode detected');
  
  // Add node_modules to the module paths
  require('module')._nodeModulePaths = function(from) {
    return [nodeModulesPath];
  };
}

const app = express();
const port = process.env.PORT || 3000;

// Log essential environment configuration
logger.info('Environment Configuration:');
logger.info(`- NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`- SQUARE_API_URL: ${process.env.SQUARE_API_URL ? 'Set' : 'Not Set'}`);
logger.info(`- SQUARE_ENVIRONMENT: ${process.env.SQUARE_ENVIRONMENT ? 'Set' : 'Not Set'}`);

// Parse JSON request bodies
logger.info('Setting up middleware...');
app.use(express.json());

// Log routes setup
logger.info('Setting up routes...');

// Log only non-static requests
app.use((req, res, next) => {
  if (!req.path.startsWith('/static/')) {
    logger.request(`${req.method} ${req.url}`);
  }
  next();
});

// API routes - register these BEFORE static file serving
app.use('/api/customers', customerRoutes);
app.use('/api/waivers', waiverRoutes);

app.get('/api/status', (req, res) => {
  logger.debug('Status check received');
  res.json({ status: 'ok' });
});

// Determine the correct path for static files
logger.info('Configuring static file serving...');
let staticPath;
if (process.env.NODE_ENV === 'production' && typeof process.resourcesPath !== 'undefined') {
  // In production, we need to handle both unpacked and installed versions
  const appRoot = path.resolve(process.resourcesPath, '..');
  const appAsarPath = path.join(process.resourcesPath, 'app.asar');
  console.log('appRoot:', appRoot);
  console.log('appAsarPath:', appAsarPath);
  // Check if we're in an asar archive
  if (fs.existsSync(appAsarPath)) {
    // We're in the installed version, static files are in app.asar/dist
    staticPath = path.join(appAsarPath, 'dist');
  } else {
    // We're in the unpacked version, static files are in the app root
    staticPath = appRoot;
  }
  console.log('staticPath:', staticPath);
  console.log('Does staticPath exist?', fs.existsSync(staticPath));
  console.log('Does index.html exist?', fs.existsSync(path.join(staticPath, 'index.html')));
} else {
  staticPath = path.join(__dirname, '../../dist');
  console.log('staticPath (dev):', staticPath);
  console.log('Does staticPath exist?', fs.existsSync(staticPath));
  console.log('Does index.html exist?', fs.existsSync(path.join(staticPath, 'index.html')));
}

// Serve static files
logger.info(`Setting up static file serving from: ${staticPath}`);
app.use(express.static(staticPath));

// Log static file serving errors
logger.info('Setting up error handlers...');
app.use((err, req, res, next) => {
  if (err) {
    logger.error(`Static file error: ${err.message}`);
  }
  next(err);
});

// Catch-all route for SPA
logger.info('Setting up catch-all route...');
app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  logger.info(`Serving index.html from: ${indexPath}`);
  res.sendFile(indexPath);
});

// Start server
logger.info('Attempting to start server...');
const server = app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
}).on('error', (err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});

// Set timeout for server startup
const startupTimeout = setTimeout(() => {
  logger.error('Server startup timed out');
  process.exit(1);
}, 30000);

server.once('listening', () => {
  clearTimeout(startupTimeout);
  logger.info('Server startup completed successfully');
});

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal');
  logger.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT signal');
  logger.end();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  logger.end();
  process.exit(1);
});