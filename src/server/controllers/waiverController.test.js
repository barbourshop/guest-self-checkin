//const WaiverController = require('./waiverController');

const mockCheckStatus = jest.fn();
const mockSetStatus = jest.fn();

// Mock the waiverService module
jest.mock('../services/waiverService', () => ({
    checkStatus: mockCheckStatus,
    setStatus: mockSetStatus
  }));
const WaiverService = require('../services/waiverService');
const controller = require('./waiverController');

describe('WaiverController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    
    mockReq = {
      params: { customerId: 'customer123' }
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('checkStatus', () => {
    it('should return waiver status', async () => {
        mockCheckStatus.mockResolvedValueOnce(true);

      await controller.checkStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ 
        hasSignedWaiver: true 
      });
    });

    it('should handle missing customer ID', async () => {
      mockReq.params = {};
      
      await controller.checkStatus(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Customer ID is required'
      });
    });
  });

  describe('setStatus', () => {
    it('should set waiver as signed', async () => {
      WaiverService.setStatus.mockResolvedValueOnce(true);

      await controller.setStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(true);
    });

    it('should handle service errors', async () => {
      WaiverService.setStatus.mockRejectedValueOnce(
        new Error('Failed to set waiver')
      );

      await controller.setStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});