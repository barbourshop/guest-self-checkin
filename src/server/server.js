const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

// Import routes
const customerRoutes = require('./routes/customerRoutes');
const waiverRoutes = require('./routes/waiverRoutes');
const logger = require('./logger');

function logStartupInfo(phase, message) {
  const info = `[${phase}] ${message}`;
  console.log(info);
  logger.info(info);
}

// Set up logging
logStartupInfo('init', 'Server process starting...');
logStartupInfo('init', `Process ID: ${process.pid}`);
logStartupInfo('init', `NODE_ENV: ${process.env.NODE_ENV}`);
logStartupInfo('init', `Current directory: ${process.cwd()}`);
logStartupInfo('init', `resourcesPath: ${process.resourcesPath}`);
logStartupInfo('init', `RESOURCES_PATH env: ${process.env.RESOURCES_PATH}`);

// Get the resources path
const resourcesPath = process.env.RESOURCES_PATH;
if (!resourcesPath) {
  logStartupInfo('init', 'ERROR: RESOURCES_PATH environment variable is not set');
  process.exit(1);
}

try {
  logStartupInfo('init', 'Creating Express app...');
  const app = express();
  const port = process.env.PORT || 3000;

  // Log essential environment configuration
  logStartupInfo('config', 'Environment Configuration:');
  logStartupInfo('config', `- NODE_ENV: ${process.env.NODE_ENV}`);
  logStartupInfo('config', `- Port: ${port}`);
  
  // Parse JSON request bodies
  logStartupInfo('middleware', 'Setting up middleware...');
  app.use(express.json());

  // Add request logging middleware
  app.use((req, res, next) => {
    logStartupInfo('request', `${req.method} ${req.url}`);
    next();
  });
  
  // Log routes setup
  logStartupInfo('routes', 'Setting up routes...');
  app.use('/api/customers', customerRoutes);
  app.use('/api/waivers', waiverRoutes);
  
  // Determine the correct path for static files
  logStartupInfo('static', 'Configuring static file serving...');
  const staticPath = path.join(resourcesPath, 'dist');
  
  // Check if static directory exists and is accessible
  try {
    logStartupInfo('static', `Checking static directory: ${staticPath}`);
    const stats = fs.statSync(staticPath);
    logStartupInfo('static', `Static directory exists: ${stats.isDirectory()}`);
    
    const files = fs.readdirSync(staticPath);
    logStartupInfo('static', `Files in static directory: ${files.join(', ')}`);
    
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      logStartupInfo('static', 'index.html found');
      // Log the first few lines of index.html to verify its contents
      try {
        const indexContent = fs.readFileSync(indexPath, 'utf8').split('\n').slice(0, 5).join('\n');
        logStartupInfo('static', `First few lines of index.html:\n${indexContent}`);
      } catch (err) {
        logStartupInfo('static', `Error reading index.html: ${err.message}`);
      }
    } else {
      logStartupInfo('static', 'ERROR: index.html not found');
    }
  } catch (err) {
    logStartupInfo('static', `ERROR accessing static directory: ${err.message}`);
    process.exit(1);
  }

  // Serve static files with detailed error logging
  logStartupInfo('static', `Setting up static file serving from: ${staticPath}`);
  app.use(express.static(staticPath, {
    index: 'index.html',
    fallthrough: true,
    redirect: false
  }));

  // Catch-all route for SPA with detailed error handling
  logStartupInfo('routes', 'Setting up catch-all route...');
  app.get('*', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    logStartupInfo('routes', `Serving index.html from: ${indexPath} for path: ${req.path}`);
    res.sendFile(indexPath, err => {
      if (err) {
        logStartupInfo('error', `Error serving index.html: ${err.message}`);
        res.status(500).send(`Error serving application: ${err.message}`);
      }
    });
  });

  // Start server
  logStartupInfo('startup', 'Starting server...');

  // Error handler for uncaught errors
  function handleError(err) {
    logStartupInfo('error', `Fatal error: ${err.message}`);
    logStartupInfo('error', err.stack || 'No stack trace available');
    process.exit(1);
  }

  try {
    const server = app.listen(port, () => {
      logStartupInfo('startup', `Server is running on http://localhost:${port}`);
    }).on('error', (err) => {
      handleError(err);
    });

    // Handle various termination signals
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, () => {
        logStartupInfo('shutdown', `Received ${signal} signal`);
        server.close(() => {
          logStartupInfo('shutdown', 'Server closed gracefully');
          process.exit(0);
        });
      });
    });

    process.on('uncaughtException', handleError);
    process.on('unhandledRejection', handleError);

  } catch (err) {
    handleError(err);
  }

} catch (err) {
  logStartupInfo('error', `Fatal error during startup: ${err.message}`);
  logStartupInfo('error', err.stack);
  process.exit(1);
}