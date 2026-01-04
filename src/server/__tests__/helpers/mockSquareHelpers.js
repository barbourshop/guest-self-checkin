const MockSquareService = require('../../services/mockSquareService');

/**
 * Create a configured mock Square service with common test scenarios
 */
function createMockSquareService() {
  const mockService = new MockSquareService();
  
  // Add some default test customers
  mockService.addCustomer({
    id: 'CUSTOMER_MEMBER_1',
    given_name: 'John',
    family_name: 'Doe',
    email_address: 'john.doe@example.com',
    phone_number: '+15551234567',
    reference_id: 'LOT123',
    segment_ids: ['MEMBERSHIP_SEGMENT_ID']
  });
  
  mockService.addCustomer({
    id: 'CUSTOMER_NON_MEMBER_1',
    given_name: 'Jane',
    family_name: 'Smith',
    email_address: 'jane.smith@example.com',
    phone_number: '+15559876543',
    reference_id: 'LOT456',
    segment_ids: []
  });
  
  // Add test orders
  mockService.addOrder({
    id: 'ORDER_VALID_CHECKIN',
    customer_id: 'CUSTOMER_MEMBER_1',
    location_id: 'LOCATION_1',
    state: 'COMPLETED',
    created_at: new Date().toISOString(),
    line_items: [
      {
        uid: 'line_item_1',
        catalog_object_id: 'CHECKIN_CATALOG_ITEM_ID',
        catalog_object_variant_id: 'CHECKIN_VARIANT_ID',
        name: 'Day Pass',
        quantity: '1',
        variation_name: 'Single Entry'
      }
    ],
    total_money: {
      amount: 1000,
      currency: 'USD'
    }
  });
  
  mockService.addOrder({
    id: 'ORDER_INVALID_CHECKIN',
    customer_id: 'CUSTOMER_MEMBER_1',
    location_id: 'LOCATION_1',
    state: 'COMPLETED',
    created_at: new Date().toISOString(),
    line_items: [
      {
        uid: 'line_item_2',
        catalog_object_id: 'WRONG_CATALOG_ITEM_ID',
        name: 'Other Item',
        quantity: '1'
      }
    ],
    total_money: {
      amount: 500,
      currency: 'USD'
    }
  });
  
  return mockService;
}

/**
 * Configure mock service for membership test scenarios
 */
function setupMembershipTestData(mockService, catalogItemId, variantId) {
  // Add order with membership item
  mockService.addOrder({
    id: 'ORDER_WITH_MEMBERSHIP',
    customer_id: 'CUSTOMER_MEMBER_1',
    location_id: 'LOCATION_1',
    state: 'COMPLETED',
    created_at: new Date().toISOString(),
    line_items: [
      {
        uid: 'line_item_membership',
        catalog_object_id: catalogItemId,
        catalog_object_variant_id: variantId,
        name: 'Membership',
        quantity: '1',
        variation_name: 'Annual Membership'
      }
    ],
    total_money: {
      amount: 50000,
      currency: 'USD'
    }
  });
}

module.exports = {
  createMockSquareService,
  setupMembershipTestData
};

