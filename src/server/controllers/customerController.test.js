const CustomerController = require('./customerController').CustomerController;
const squareService = require('../services/squareService');

describe('CustomerController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    controller = new CustomerController(squareService);
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('searchByPhone', () => {
    it('should validate phone number input', async () => {
      await controller.searchByPhone(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Phone number is required' 
      });
    });

    it('should handle service errors', async () => {
      mockReq.body.phone = '555-0123';
      jest.spyOn(squareService, 'searchCustomers')
        .mockRejectedValueOnce(new Error('Service error'));

      await controller.searchByPhone(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('searchByEmail', () => {
    it('should validate email input', async () => {
      await controller.searchByEmail(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return customers when found', async () => {
      mockReq.body.email = 'test@example.com';
      const mockCustomers = [{ id: '123', email: 'test@example.com' }];
      
      jest.spyOn(controller.squareService, 'searchCustomers')
        .mockResolvedValueOnce(mockCustomers);

      await controller.searchByEmail(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(mockCustomers);
    });

    it('should handle empty email', async () => {
      mockReq.body.email = '';
      await controller.searchByEmail(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Email is required'
      });
    });

    it('should handle service errors with detailed message', async () => {
      mockReq.body.email = 'test@example.com';
      const errorMessage = 'API rate limit exceeded';
      jest.spyOn(controller.squareService, 'searchCustomers')
        .mockRejectedValueOnce(new Error(errorMessage));

      await controller.searchByEmail(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: `Error searching customers by email: ${errorMessage}`
      });
    });
  });

  describe('listCustomers', () => {
    it('should handle pagination parameters', async () => {
      mockReq.query = { limit: '10', cursor: 'abc123' };
      const mockCustomers = [{ id: '123' }];
      jest.spyOn(controller.squareService, 'listCustomers')
        .mockResolvedValueOnce({ customers: mockCustomers, cursor: 'def456' });

      await controller.listCustomers(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        customers: mockCustomers,
        cursor: 'def456'
      });
    });

    it('should handle missing pagination parameters', async () => {
      mockReq.query = {};
      await controller.listCustomers(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
