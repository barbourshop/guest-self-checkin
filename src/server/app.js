// This is the main entry point for the server
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config();

// Set up logging
const logPath = path.join(process.env.APPDATA || process.env.HOME, 'app-server.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  logStream.write(logMessage);
}

const customerRoutes = require('./routes/customerRoutes');
const waiverRoutes = require('./routes/waiverRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Determine if we're in development or production
const isDev = process.env.NODE_ENV !== 'production';
log(`Server starting in ${isDev ? 'development' : 'production'} mode`);

// Configure middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the correct location based on environment
if (isDev) {
  const distPath = path.join(__dirname, '../../dist');
  const publicPath = path.join(__dirname, '../../public');
  log(`Serving static files from: ${distPath} and ${publicPath}`);
  app.use(express.static(distPath));
  app.use(express.static(publicPath));
} else {
  // In production, use the resources path
  const distPath = path.join(process.resourcesPath, 'dist');
  log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));
}

// API routes
app.use('/api/customers', customerRoutes);
app.use('/api/waivers', waiverRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  log('Health check requested');
  res.json({ status: 'ok' });
});

// Handle any requests that don't match the above
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../../dist/index.html');
  log(`Serving index.html from: ${indexPath}`);
  res.sendFile(indexPath);
});

// Error handling
app.use(errorHandler);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}\nreason: ${reason}`);
});

// Log server startup
const port = process.env.PORT || 3000;
app.listen(port, () => {
  log(`Server is running on http://localhost:${port}`);
});

module.exports = app;