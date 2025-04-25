// This is the main entry point for the server
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

const customerRoutes = require('./routes/customerRoutes');
const waiverRoutes = require('./routes/waiverRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Determine if we're in development or production
const isDev = process.env.NODE_ENV !== 'production';

// Configure middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the correct location based on environment
if (isDev) {
  app.use(express.static(path.join(__dirname, '../../dist')));
  app.use(express.static('public'));
} else {
  // In production, serve from the resources directory
  app.use(express.static(path.join(__dirname, '../../dist')));
}

// API routes
app.use('/api/customers', customerRoutes);
app.use('/api/waivers', waiverRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Handle any requests that don't match the above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// Error handling
app.use(errorHandler);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;