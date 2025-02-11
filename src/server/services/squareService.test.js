const SquareService = require('./squareService');
const POOL_PASS_CATALOG_IDS = require('../config/square').POOL_PASS_CATALOG_IDS;

describe('SquareService', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
      });

    afterEach(() => {
    jest.resetAllMocks();
    });

  describe('searchCustomers', () => {
    it('should search by phone number', async () => {
        // Mock the initial customer search
        global.fetch.mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            customers: [{ id: '123', phone_number: '555-0123' }]
          })
        }));
  
        // Mock the subsequent orders search that happens during enrichment
        global.fetch.mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            orders: []  // or whatever order data you want to test with
          })
        }));
  
        const result = await SquareService.searchCustomers('phone', '555-0123');
        expect(result).toHaveLength(1);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/customers/search'),
          expect.any(Object)
        );
      });

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          errors: [{ detail: 'API Error' }]
        })
      });

      await expect(
        SquareService.searchCustomers('phone', '555-0123')
      ).rejects.toThrow('API Error');
    });

    it('should validate search type', async () => {
      await expect(
        SquareService.searchCustomers('invalid', '555-0123')
      ).rejects.toThrow('Invalid search type');
    });
  });

  describe('getCustomerOrders', () => {
    it('should handle empty customer ID', async () => {
        // Mock fetch *inside* this test
        global.fetch = jest.fn().mockResolvedValueOnce({
          ok: true, // This is important! Even for an empty ID, you likely want a mocked response.
          json: () => Promise.resolve({}) // Or a more realistic empty response if needed
        });
  
        await expect(SquareService.getCustomerOrders('')).rejects.toThrow('Customer ID is required');
        expect(global.fetch).not.toHaveBeenCalled(); // Assert that fetch was not called
      });

    it('should handle missing customer ID', async () => {
        // Mock fetch *inside* this test
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true, // This is important! Even for an empty ID, you likely want a mocked response.
            json: () => Promise.resolve({}) // Or a more realistic empty response if needed
            });
      await expect(SquareService.getCustomerOrders()).rejects.toThrow('Customer ID is required');
    });

    it('should fetch orders successfully', async () => {
      const mockOrders = [{ id: 'order1' }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orders: mockOrders })
      });

      const result = await SquareService.getCustomerOrders('customer123');
      expect(result).toEqual(mockOrders);
    });

    it('should handle no orders found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await SquareService.getCustomerOrders('customer123');
      expect(result).toEqual([]);
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        SquareService.getCustomerOrders('customer123')
      ).rejects.toThrow('Failed to fetch customer orders');
    });

    it('should handle malformed response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null)
      });

      await expect(
        SquareService.getCustomerOrders('customer123')
      ).rejects.toThrow('Failed to fetch customer orders');
    });

    it('should handle undefined response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(undefined)
      });
      await expect(
        SquareService.getCustomerOrders('customer123')
      ).rejects.toThrow('Failed to fetch customer orders');
    });

    it('should handle non-200 response with error details', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          errors: [{
            detail: 'Rate limit exceeded'
          }]
        })
      });

      await expect(
        SquareService.getCustomerOrders('customer123')
      ).rejects.toThrow('Failed to fetch customer orders');
    });

    it('should handle non-200 response without error details', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({})
      });

      await expect(
        SquareService.getCustomerOrders('customer123')
      ).rejects.toThrow('Failed to fetch customer orders');
    });

    it('should handle invalid JSON response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(
        SquareService.getCustomerOrders('customer123')
      ).rejects.toThrow('Failed to fetch customer orders');
    });
  });

  describe('enrichCustomerData', () => {
    it('should check for pool pass in orders', async () => {
        console.log('Pool Pass Catalog IDs:', POOL_PASS_CATALOG_IDS); // Debug log
        
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            orders: [{
              line_items: [{
                catalog_object_id: POOL_PASS_CATALOG_IDS[0] // Make sure this matches
              }]
            }]
          })
        });
  
        const result = await SquareService.enrichCustomerData({ id: '123' });
        expect(result.membershipStatus).toBe('Member');
      });

    it('should handle customer without orders', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orders: [] })
      });

      const result = await SquareService.enrichCustomerData({ id: '123' });
      expect(result.membershipStatus).toBe('Non-Member');
    });

    it('should handle API errors when fetching orders', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          errors: [{ detail: 'Failed to fetch orders' }]
        })
      });

      await expect(
        SquareService.enrichCustomerData({ id: '123' })
      ).rejects.toThrow('Failed to fetch customer orders');
    });

    it('should handle null line items', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          orders: [{
            id: 'order1',
            line_items: null
          }]
        })
      });

      const result = await SquareService.enrichCustomerData({ id: '123' });
      expect(result.membershipStatus).toBe("Non-Member");
    });

    it('should handle malformed line items', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            orders: [{
              line_items: [
                { catalog_object_id: null },
                {},
                { catalog_object_id: undefined }
              ]
            }]
          })
        });
  
        const result = await SquareService.enrichCustomerData({ id: 'customer123' });
        expect(result.membershipStatus).toBe("Non-Member");
      });

    it('should handle orders without line items', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          orders: [{
            id: 'order1'
          }]
        })
      });

      const result = await SquareService.enrichCustomerData({ id: '123' });
      expect(result.membershipStatus).toBe("Non-Member");
    });

    it('should handle multiple pool pass catalog IDs', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          orders: [{
            line_items: [{
              catalog_object_id: POOL_PASS_CATALOG_IDS[0]
            }]
          }, {
            line_items: [{
              catalog_object_id: 'non-pool-pass-id'
            }]
          }]
        })
      });

      const result = await SquareService.enrichCustomerData({ id: '123' });
      expect(result.membershipStatus).toBe("Member");
    });

    it('should handle complex line items structure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          orders: [{
            line_items: [{
              catalog_object_id: null
            }, {
              catalog_object_id: POOL_PASS_CATALOG_IDS[0]
            }, {
              // Missing catalog_object_id
            }]
          }]
        })
      });

      const result = await SquareService.enrichCustomerData({ id: '123' });
      expect(result.membershipStatus).toBe("Member");
    });

    it('should handle missing customer ID', async () => {
      await expect(
        SquareService.enrichCustomerData({})
      ).rejects.toThrow('Customer ID is required');
    });
  });
});