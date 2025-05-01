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
// Use RESOURCES_PATH env var as a fallback for process.resourcesPath
const resourcesPath = process.env.RESOURCES_PATH || process.resourcesPath;
// Set up module resolution for production
if (process.env.NODE_ENV === 'production' && typeof resourcesPath !== 'undefined') {
  const appPath = resourcesPath;
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
if (process.env.NODE_ENV === 'production' && typeof resourcesPath !== 'undefined') {
  // In production, static files are in resources/dist
  staticPath = path.join(resourcesPath, 'dist');
  
  logger.info('Production mode detected');
  logger.info(`Static path set to: ${staticPath}`);
  
  // Log the contents of the static directory
  if (fs.existsSync(staticPath)) {
    logger.info('Static directory exists');
    try {
      const files = fs.readdirSync(staticPath);
      logger.info(`Files in static directory: ${files.join(', ')}`);
    } catch (err) {
      logger.error(`Error reading static directory: ${err.message}`);
    }
  } else {
    logger.error(`Static directory does not exist: ${staticPath}`);
  }
} else {
  staticPath = path.join(__dirname, '../../dist');
  logger.info(`Development mode, static path set to: ${staticPath}`);
}

// Serve static files
logger.info(`Setting up static file serving from: ${staticPath}`);
app.use(express.static(staticPath));

// Catch-all route for SPA
app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  logger.info(`Serving index.html from: ${indexPath}`);
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    logger.error(`index.html not found at: ${indexPath}`);
    res.status(404).send('index.html not found');
  }
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