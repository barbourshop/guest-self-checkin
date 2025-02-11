const WaiverService = require('./waiverService');
const SQUARE_API_CONFIG = require('../config/square');

describe('WaiverService', () => {
  let service;
  
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('checkWaiverStatus', () => {
    it('should return true when waiver is signed', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          custom_attribute: { value: 'true' }
        })
      });

      const result = await WaiverService.checkStatus('customer123');
      expect(result).toBe(true);
    });

    it('should return false when waiver is not found', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 404,
        ok: false
      });

      const result = await WaiverService.checkStatus('customer123');
      expect(result).toBe(false);
    });

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          errors: [{ detail: 'Server Error' }]
        })
      });

      await expect(
        WaiverService.checkStatus('customer123')
      ).rejects.toThrow('Server Error');
    });
  });

  describe('setWaiverSigned', () => {
    it('should successfully set waiver as signed', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await WaiverService.setStatus('customer123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/customers/customer123/custom-attributes/waiver-signed'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer undefined',
            'Content-Type': 'application/json',
            'Square-Version': '2025-01-23'
          }
        })
      );
    });

    it('should handle API errors when setting waiver', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          errors: [{ detail: 'Failed to set waiver' }]
        })
      });

      await expect(
        WaiverService.setStatus('customer123')
      ).rejects.toThrow('Failed to set waiver');
    });
  });
});