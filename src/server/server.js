const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const customerRoutes = require('./routes/customerRoutes');
const waiverRoutes = require('./routes/waiverRoutes');
const logger = require('./logger');

function log(message) {
  console.log(`[Server] ${message}`);
  logger.info(message);
}

log('Starting server...');

// Get the resources path
const resourcesPath = process.env.RESOURCES_PATH;
if (!resourcesPath) {
  log('ERROR: RESOURCES_PATH environment variable is not set');
  process.exit(1);
}

try {
  const app = express();
  const port = process.env.PORT || 3000;

  // Middleware
  app.use(express.json());
  
  // Routes
  app.use('/api/customers', customerRoutes);
  app.use('/api/waivers', waiverRoutes);
  
  // Static files
  const staticPath = path.join(resourcesPath, 'dist');
  
  // Verify static directory
  try {
    const stats = fs.statSync(staticPath);
    if (!stats.isDirectory()) {
      throw new Error('Static path is not a directory');
    }
    
    if (!fs.existsSync(path.join(staticPath, 'index.html'))) {
      throw new Error('index.html not found in static directory');
    }
  } catch (err) {
    log(`ERROR: Static files setup failed: ${err.message}`);
    process.exit(1);
  }

  // Serve static files
  app.use(express.static(staticPath, {
    index: 'index.html',
    fallthrough: true,
    redirect: false
  }));

  // Catch-all route for SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'), err => {
      if (err) {
        log(`Error serving index.html: ${err.message}`);
        res.status(500).send('Error serving application');
      }
    });
  });

  // Error handler
  function handleError(err) {
    log(`Fatal error: ${err.message}`);
    process.exit(1);
  }

  // Start server
  const server = app.listen(port, () => {
    log(`Server is running on http://localhost:${port}`);
  }).on('error', handleError);

  // Handle termination
  ['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, () => {
      server.close(() => {
        log('Server closed');
        process.exit(0);
      });
    });
  });

  process.on('uncaughtException', handleError);
  process.on('unhandledRejection', handleError);

} catch (err) {
  log(`Fatal error during startup: ${err.message}`);
  process.exit(1);
}