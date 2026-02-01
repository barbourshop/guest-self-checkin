const request = require('supertest');

/**
 * Helper to make API requests in tests
 * @param {Object} app - Express app instance
 * @param {string} method - HTTP method (get, post, etc.)
 * @param {string} path - API path
 * @param {Object} data - Request body (for POST/PUT)
 * @returns {Promise} Supertest request
 */
function apiRequest(app, method, path, data = null) {
  let req = request(app)[method](path);
  
  if (data) {
    req = req.send(data);
  }
  
  return req;
}

/**
 * Helper to create a test Express app with routes
 * Useful for integration testing
 */
function createTestApp(routes) {
  const express = require('express');
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  if (routes) {
    app.use(routes);
  }
  
  return app;
}

module.exports = {
  apiRequest,
  createTestApp
};

