const { createTestDatabase, closeTestDatabase, clearTestDatabase } = require('../../__tests__/helpers/testDatabase');
const { createMockSquareService } = require('../../__tests__/helpers/mockSquareHelpers');

// Create mock square service
const mockSquareService = createMockSquareService();

// Mock the squareService module before requiring CheckinVerification
jest.mock('../squareService', () => {
  return mockSquareService;
});

// Mock membershipCache - use actual implementation but with test database
jest.mock('../membershipCache', () => {
  const { createTestDatabase } = require('../../__tests__/helpers/testDatabase');
  const MembershipCache = jest.requireActual('../membershipCache');
  return jest.fn().mockImplementation((db) => {
    return new MembershipCache(db || createTestDatabase());
  });
});

const CheckinVerification = require('../checkinVerification');

describe('CheckinVerification', () => {
  let verification;
  let db;
  let originalCheckinItemId;
  let originalCheckinVariantId;

  beforeEach(() => {
    // Set environment variables before creating verification instance
    originalCheckinItemId = process.env.CHECKIN_CATALOG_ITEM_ID;
    originalCheckinVariantId = process.env.CHECKIN_VARIANT_ID;
    process.env.CHECKIN_CATALOG_ITEM_ID = 'CHECKIN_CATALOG_ITEM_ID';
    process.env.CHECKIN_VARIANT_ID = 'CHECKIN_VARIANT_ID';
    
    // Clear module cache to reload config with new env vars
    jest.resetModules();
    
    db = createTestDatabase();
    mockSquareService.reset();
    
    // Setup test orders
    mockSquareService.addOrder({
      id: 'ORDER_VALID_CHECKIN',
      customer_id: 'CUSTOMER_MEMBER_1',
      location_id: 'LOCATION_1',
      state: 'COMPLETED',
      line_items: [
        {
          catalog_object_id: 'CHECKIN_CATALOG_ITEM_ID',
          catalog_object_variant_id: 'CHECKIN_VARIANT_ID',
          name: 'Day Pass'
        }
      ]
    });

    mockSquareService.addOrder({
      id: 'ORDER_INVALID_CHECKIN',
      customer_id: 'CUSTOMER_MEMBER_1',
      location_id: 'LOCATION_1',
      state: 'COMPLETED',
      line_items: [
        {
          catalog_object_id: 'WRONG_ITEM_ID',
          name: 'Other Item'
        }
      ]
    });

    mockSquareService.addOrder({
      id: 'ORDER_NO_CUSTOMER',
      location_id: 'LOCATION_1',
      state: 'COMPLETED',
      line_items: [
        {
          catalog_object_id: 'CHECKIN_CATALOG_ITEM_ID',
          catalog_object_variant_id: 'CHECKIN_VARIANT_ID',
          name: 'Day Pass'
        }
      ]
    });

    // Setup customers
    mockSquareService.addCustomer({
      id: 'CUSTOMER_MEMBER_1',
      given_name: 'John',
      family_name: 'Doe'
    });

    // Re-require after resetting modules
    const CheckinVerificationReloaded = require('../checkinVerification');
    verification = new CheckinVerificationReloaded();
  });

  afterEach(() => {
    clearTestDatabase(db);
    closeTestDatabase(db);
    mockSquareService.reset();
    
    // Restore environment variables
    if (originalCheckinItemId !== undefined) {
      process.env.CHECKIN_CATALOG_ITEM_ID = originalCheckinItemId;
    } else {
      delete process.env.CHECKIN_CATALOG_ITEM_ID;
    }
    if (originalCheckinVariantId !== undefined) {
      process.env.CHECKIN_VARIANT_ID = originalCheckinVariantId;
    } else {
      delete process.env.CHECKIN_VARIANT_ID;
    }
    
    // Clear module cache to reload config
    jest.resetModules();
  });

  describe('Order Verification', () => {
    it('should verify valid check-in order', async () => {
      const result = await verification.verifyCheckinOrder('ORDER_VALID_CHECKIN');

      expect(result.valid).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.customerId).toBe('CUSTOMER_MEMBER_1');
    });

    it('should reject order with wrong catalog item', async () => {
      const result = await verification.verifyCheckinOrder('ORDER_INVALID_CHECKIN');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('does not contain required check-in item');
    });

    it('should handle order not found', async () => {
      const result = await verification.verifyCheckinOrder('NON_EXISTENT_ORDER');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Order not found');
    });

    it('should handle missing order ID', async () => {
      const result = await verification.verifyCheckinOrder(null);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Order ID is required');
    });

    it('should handle order without customer when membership check requested', async () => {
      const result = await verification.verifyCheckinOrder('ORDER_NO_CUSTOMER', {
        checkMembership: true
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Order does not have associated customer');
    });

    it('should allow order without customer when membership check disabled', async () => {
      const result = await verification.verifyCheckinOrder('ORDER_NO_CUSTOMER', {
        checkMembership: false
      });

      expect(result.valid).toBe(true);
      expect(result.customerId).toBeUndefined();
    });
  });

  describe('Input Detection', () => {
    it('should detect valid order ID format', () => {
      expect(CheckinVerification.isValidOrderIdFormat('CA1234567890')).toBe(true);
      expect(CheckinVerification.isValidOrderIdFormat('ORDER1234567890')).toBe(true);
      expect(CheckinVerification.isValidOrderIdFormat('ABC123DEF456')).toBe(true);
    });

    it('should reject invalid order ID format', () => {
      expect(CheckinVerification.isValidOrderIdFormat('123')).toBe(false); // Too short
      expect(CheckinVerification.isValidOrderIdFormat('john@example.com')).toBe(false); // Email
      expect(CheckinVerification.isValidOrderIdFormat('555-1234')).toBe(false); // Phone
      expect(CheckinVerification.isValidOrderIdFormat('John Doe')).toBe(false); // Name
      expect(CheckinVerification.isValidOrderIdFormat('')).toBe(false); // Empty
      expect(CheckinVerification.isValidOrderIdFormat(null)).toBe(false); // Null
    });

    it('should detect QR code vs search query', () => {
      expect(CheckinVerification.detectInputType('CA1234567890')).toBe('qr');
      expect(CheckinVerification.detectInputType('ORDER1234567890')).toBe('qr');
      expect(CheckinVerification.detectInputType('john@example.com')).toBe('search');
      expect(CheckinVerification.detectInputType('555-1234')).toBe('search');
      expect(CheckinVerification.detectInputType('John Doe')).toBe('search');
      expect(CheckinVerification.detectInputType('LOT123')).toBe('search');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSquareService.setShouldFail(true, 'verifyCheckinOrder');

      const result = await verification.verifyCheckinOrder('ANY_ORDER');

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should handle missing configuration', async () => {
      // Create new verification instance without config
      delete process.env.CHECKIN_CATALOG_ITEM_ID;
      delete process.env.CHECKIN_VARIANT_ID;
      jest.resetModules();
      const CheckinVerificationWithoutConfig = require('../checkinVerification');
      const verificationWithoutConfig = new CheckinVerificationWithoutConfig();

      const result = await verificationWithoutConfig.verifyCheckinOrder('ANY_ORDER');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Check-in configuration error');
    });
  });
});

