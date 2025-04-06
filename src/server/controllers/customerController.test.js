// Add fetch polyfill for Node.js environment
const fetch = require('node-fetch');
global.fetch = fetch;

const request = require('supertest');
const express = require('express');
const customerController = require('../controllers/customerController');
const squareService = require('../services/squareService'); // Import the instance
const customerService = require('../services/customerService'); // Import customerService

// Mock the services
jest.mock('../services/squareService');
jest.mock('../services/customerService');

// Explicitly override instance methods
squareService.searchCustomers = jest.fn();
customerService.searchCustomers = jest.fn();

const app = express();
app.use(express.json());
app.post('/searchByPhone', customerController.searchByPhone);

describe('CustomerController - searchByPhone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return customers when found', async () => {
    const mockCustomers = [{ id: '123', name: 'John Doe' }];
    
    // Mock the customerService.searchCustomers method instead of squareService
    customerService.searchCustomers.mockResolvedValue(mockCustomers);

    const response = await request(app)
      .post('/searchByPhone')
      .send({ phone: '555-0123' });

    console.log('Mock function called:', customerService.searchCustomers.mock.calls);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockCustomers);
    expect(customerService.searchCustomers).toHaveBeenCalledWith('phone', '555-0123');
  });
});
