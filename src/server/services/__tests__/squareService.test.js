const MockSquareService = require('../mockSquareService');
const { createMockSquareService } = require('../../__tests__/helpers/mockSquareHelpers');

// Mock the squareService module
jest.mock('../squareService', () => {
  const mockService = new (require('../mockSquareService'))();
  return mockService;
});

describe('SquareService Integration with Mock', () => {
  let mockService;

  beforeEach(() => {
    mockService = createMockSquareService();
    // Replace the real service with mock for testing
    jest.doMock('../squareService', () => mockService);
  });

  afterEach(() => {
    mockService.reset();
  });

  describe('Customer Search', () => {
    it('should search customers by email', async () => {
      const results = await mockService.searchCustomers('email', 'john.doe@example.com');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].email_address).toContain('john.doe');
    });

    it('should search customers by phone', async () => {
      const results = await mockService.searchCustomers('phone', '5551234567');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search customers by name', async () => {
      const results = await mockService.searchCustomers('name', 'John');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].given_name).toContain('John');
    });
  });

  describe('Membership Checking by Catalog Item', () => {
    it('should identify member with correct catalog item/variant', async () => {
      const catalogItemId = 'MEMBERSHIP_ITEM_ID';
      const variantId = 'MEMBERSHIP_VARIANT_ID';

      // Setup membership order
      mockService.addOrder({
        id: 'MEMBERSHIP_ORDER',
        customer_id: 'CUSTOMER_MEMBER_1',
        line_items: [
          {
            catalog_object_id: catalogItemId,
            catalog_object_variant_id: variantId,
            name: 'Annual Membership'
          }
        ]
      });

      const hasMembership = await mockService.checkMembershipByCatalogItem(
        'CUSTOMER_MEMBER_1',
        catalogItemId,
        variantId
      );

      expect(hasMembership).toBe(true);
    });

    it('should identify non-member without catalog item', async () => {
      const catalogItemId = 'MEMBERSHIP_ITEM_ID';
      const variantId = 'MEMBERSHIP_VARIANT_ID';

      const hasMembership = await mockService.checkMembershipByCatalogItem(
        'CUSTOMER_NON_MEMBER_1',
        catalogItemId,
        variantId
      );

      expect(hasMembership).toBe(false);
    });
  });

  describe('Check-in Order Verification', () => {
    it('should verify valid check-in order', async () => {
      const checkinItemId = 'CHECKIN_CATALOG_ITEM_ID';
      const checkinVariantId = 'CHECKIN_VARIANT_ID';

      mockService.addOrder({
        id: 'ORDER_VALID_CHECKIN',
        customer_id: 'CUSTOMER_MEMBER_1',
        line_items: [
          {
            catalog_object_id: checkinItemId,
            catalog_object_variant_id: checkinVariantId,
            name: 'Day Pass'
          }
        ]
      });

      const result = await mockService.verifyCheckinOrder(
        'ORDER_VALID_CHECKIN',
        checkinItemId,
        checkinVariantId
      );

      expect(result.valid).toBe(true);
      expect(result.order).toBeDefined();
    });

    it('should reject order with wrong catalog item', async () => {
      const checkinItemId = 'CHECKIN_CATALOG_ITEM_ID';
      const checkinVariantId = 'CHECKIN_VARIANT_ID';

      mockService.addOrder({
        id: 'ORDER_INVALID_CHECKIN',
        customer_id: 'CUSTOMER_MEMBER_1',
        line_items: [
          {
            catalog_object_id: 'WRONG_ITEM_ID',
            name: 'Other Item'
          }
        ]
      });

      const result = await mockService.verifyCheckinOrder(
        'ORDER_INVALID_CHECKIN',
        checkinItemId,
        checkinVariantId
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('does not contain required check-in item');
    });

    it('should reject order with wrong variant', async () => {
      const checkinItemId = 'CHECKIN_CATALOG_ITEM_ID';
      const checkinVariantId = 'CHECKIN_VARIANT_ID';

      mockService.addOrder({
        id: 'ORDER_WRONG_VARIANT',
        customer_id: 'CUSTOMER_MEMBER_1',
        line_items: [
          {
            catalog_object_id: checkinItemId,
            catalog_object_variant_id: 'WRONG_VARIANT_ID',
            name: 'Day Pass'
          }
        ]
      });

      const result = await mockService.verifyCheckinOrder(
        'ORDER_WRONG_VARIANT',
        checkinItemId,
        checkinVariantId
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      mockService.setShouldFail(true, 'getOrder');

      await expect(mockService.getOrder('ANY_ORDER')).rejects.toThrow('Mock Square API failure');
    });

    it('should handle missing orders', async () => {
      const result = await mockService.verifyCheckinOrder(
        'NON_EXISTENT_ORDER',
        'CHECKIN_ITEM_ID',
        'CHECKIN_VARIANT_ID'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Order not found');
    });
  });
});

