const request = require('supertest');
const express = require('express');
const customerController = require('../controllers/customerController');
const squareService = require('../services/squareService'); // Import the instance

jest.mock('../services/squareService'); // Mock the entire module

// Explicitly override instance methods
squareService.searchCustomers = jest.fn();

const app = express();
app.use(express.json());
app.post('/searchByPhone', customerController.searchByPhone);

describe('CustomerController - searchByPhone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return customers when found', async () => {
    const mockCustomers = [{ id: '123', name: 'John Doe' }];
    
    squareService.searchCustomers.mockResolvedValue(mockCustomers); // Mock the method

    const response = await request(app)
      .post('/searchByPhone')
      .send({ phone: '555-0123' });

    console.log('Mock function called:', squareService.searchCustomers.mock.calls);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockCustomers);
    expect(squareService.searchCustomers).toHaveBeenCalledWith('phone', '555-0123');
  });
});
