const MockSquareService = require('../mockSquareService');

describe('MockSquareService', () => {
  let mockService;

  beforeEach(() => {
    mockService = new MockSquareService();
  });

  afterEach(() => {
    mockService.reset();
  });

  describe('Customer Management', () => {
    it('should add and retrieve customers', async () => {
      const customer = {
        id: 'TEST_CUSTOMER_1',
        given_name: 'Test',
        family_name: 'User',
        email_address: 'test@example.com',
        phone_number: '+15551234567'
      };

      mockService.addCustomer(customer);
      const result = await mockService.getCustomer('TEST_CUSTOMER_1');

      expect(result).toEqual(customer);
    });

    it('should throw error when customer not found', async () => {
      await expect(mockService.getCustomer('NON_EXISTENT')).rejects.toThrow('Customer not found');
    });
  });

  describe('Customer Search', () => {
    beforeEach(() => {
      mockService.addCustomer({
        id: 'C1',
        given_name: 'John',
        family_name: 'Doe',
        email_address: 'john@example.com',
        phone_number: '+15551234567',
        reference_id: 'LOT123'
      });
      mockService.addCustomer({
        id: 'C2',
        given_name: 'Jane',
        family_name: 'Smith',
        email_address: 'jane@example.com',
        phone_number: '+15559876543',
        reference_id: 'LOT456'
      });
    });

    it('should search customers by email', async () => {
      const results = await mockService.searchCustomers('email', 'john@example.com');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('C1');
    });

    it('should search customers by phone', async () => {
      const results = await mockService.searchCustomers('phone', '5551234567');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('C1');
    });

    it('should search customers by lot number', async () => {
      const results = await mockService.searchCustomers('lot', 'LOT123');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('C1');
    });

    it('should search customers by lot number with space format (BTV 1.111)', async () => {
      mockService.addCustomer({
        id: 'C_LOT_1',
        given_name: 'Test',
        family_name: 'User',
        reference_id: 'BTV 1.111'
      });
      const results = await mockService.searchCustomers('lot', 'BTV 1.111');
      expect(results).toHaveLength(1);
      expect(results[0].reference_id).toBe('BTV 1.111');
    });

    it('should search customers by lot number without space format (BTV1.111)', async () => {
      mockService.addCustomer({
        id: 'C_LOT_2',
        given_name: 'Test',
        family_name: 'User',
        reference_id: 'BTV1.111'
      });
      const results = await mockService.searchCustomers('lot', 'BTV1.111');
      expect(results).toHaveLength(1);
      expect(results[0].reference_id).toBe('BTV1.111');
    });

    it('should search customers by name', async () => {
      const results = await mockService.searchCustomers('name', 'John');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('C1');
    });
  });

  describe('Order Management', () => {
    it('should add and retrieve orders', async () => {
      const order = {
        id: 'ORDER_1',
        customer_id: 'CUSTOMER_1',
        line_items: [
          {
            catalog_object_id: 'ITEM_1',
            catalog_object_variant_id: 'VARIANT_1'
          }
        ]
      };

      mockService.addOrder(order);
      const result = await mockService.getOrder('ORDER_1');

      expect(result).toEqual(order);
    });

    it('should throw error when order not found', async () => {
      await expect(mockService.getOrder('NON_EXISTENT')).rejects.toThrow('Order not found');
    });
  });

  describe('Membership Checking', () => {
    beforeEach(() => {
      mockService.addCustomer({
        id: 'MEMBER_1',
        segment_ids: ['MEMBERSHIP_SEGMENT_ID']
      });
      mockService.addCustomer({
        id: 'NON_MEMBER_1',
        segment_ids: []
      });
    });

    it('should check membership by segment', async () => {
      const hasMembership = await mockService.checkMembershipBySegment('MEMBER_1');
      expect(hasMembership).toBe(true);

      const noMembership = await mockService.checkMembershipBySegment('NON_MEMBER_1');
      expect(noMembership).toBe(false);
    });

    it('should check membership by catalog item', async () => {
      const catalogItemId = 'MEMBERSHIP_ITEM_ID';
      const variantId = 'MEMBERSHIP_VARIANT_ID';

      // Add order with membership item
      mockService.addOrder({
        id: 'ORDER_WITH_MEMBERSHIP',
        customer_id: 'MEMBER_1',
        line_items: [
          {
            catalog_object_id: catalogItemId,
            catalog_object_variant_id: variantId
          }
        ]
      });

      const hasMembership = await mockService.checkMembershipByCatalogItem(
        'MEMBER_1',
        catalogItemId,
        variantId
      );
      expect(hasMembership).toBe(true);

      const noMembership = await mockService.checkMembershipByCatalogItem(
        'NON_MEMBER_1',
        catalogItemId,
        variantId
      );
      expect(noMembership).toBe(false);
    });
  });

  describe('Check-in Verification', () => {
    it('should verify valid check-in order', async () => {
      const checkinItemId = 'CHECKIN_ITEM_ID';
      const checkinVariantId = 'CHECKIN_VARIANT_ID';

      mockService.addOrder({
        id: 'VALID_CHECKIN_ORDER',
        customer_id: 'CUSTOMER_1',
        line_items: [
          {
            catalog_object_id: checkinItemId,
            catalog_object_variant_id: checkinVariantId
          }
        ]
      });

      const result = await mockService.verifyCheckinOrder(
        'VALID_CHECKIN_ORDER',
        checkinItemId,
        checkinVariantId
      );

      expect(result.valid).toBe(true);
      expect(result.order).toBeDefined();
    });

    it('should reject invalid check-in order', async () => {
      mockService.addOrder({
        id: 'INVALID_ORDER',
        customer_id: 'CUSTOMER_1',
        line_items: [
          {
            catalog_object_id: 'WRONG_ITEM_ID'
          }
        ]
      });

      const result = await mockService.verifyCheckinOrder(
        'INVALID_ORDER',
        'CHECKIN_ITEM_ID',
        'CHECKIN_VARIANT_ID'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('does not contain required check-in item');
    });

    it('should handle order not found', async () => {
      const result = await mockService.verifyCheckinOrder(
        'NON_EXISTENT_ORDER',
        'CHECKIN_ITEM_ID',
        'CHECKIN_VARIANT_ID'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Order not found');
    });
  });

  describe('Error Simulation', () => {
    it('should simulate network failures', async () => {
      mockService.setShouldFail(true, 'getCustomer');

      await expect(mockService.getCustomer('ANY_ID')).rejects.toThrow('Mock Square API failure');
    });

    it('should simulate network delay', async () => {
      mockService.setNetworkDelay(100);
      const start = Date.now();

      await mockService.getCustomer('NON_EXISTENT').catch(() => {});

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });
});

