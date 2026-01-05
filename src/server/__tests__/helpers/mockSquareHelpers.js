const MockSquareService = require('../../services/mockSquareService');

/**
 * Create a configured mock Square service with common test scenarios
 */
function createMockSquareService() {
  const mockService = new MockSquareService();
  
  // Add some default test customers for name search testing
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
  
  // Add more test customers for better search coverage
  mockService.addCustomer({
    id: 'CUSTOMER_MEMBER_2',
    given_name: 'John',
    family_name: 'Smith',
    email_address: 'john.smith@example.com',
    phone_number: '+15551111111',
    reference_id: 'BTV 1.111',
    segment_ids: ['MEMBERSHIP_SEGMENT_ID']
  });
  
  mockService.addCustomer({
    id: 'CUSTOMER_MEMBER_3',
    given_name: 'Mary',
    family_name: 'Johnson',
    email_address: 'mary.johnson@example.com',
    phone_number: '+15552222222',
    reference_id: 'BTV1.111',
    segment_ids: ['MEMBERSHIP_SEGMENT_ID']
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
  
  // Add membership orders for all members
  const membershipCatalogItemId = process.env.MEMBERSHIP_CATALOG_ITEM_ID || 'MEMBERSHIP_CATALOG_ITEM_ID';
  const membershipVariantId = process.env.MEMBERSHIP_VARIANT_ID || 'MEMBERSHIP_VARIANT_ID';
  
  // Membership order for CUSTOMER_MEMBER_1 (John Doe)
  mockService.addOrder({
    id: 'ORDER_MEMBERSHIP_MEMBER_1',
    customer_id: 'CUSTOMER_MEMBER_1',
    location_id: 'LOCATION_1',
    state: 'COMPLETED',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    line_items: [
      {
        uid: 'line_item_membership_1',
        catalog_object_id: membershipCatalogItemId,
        catalog_object_variant_id: membershipVariantId,
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
  
  // Membership order for CUSTOMER_MEMBER_2 (John Smith)
  mockService.addOrder({
    id: 'ORDER_MEMBERSHIP_MEMBER_2',
    customer_id: 'CUSTOMER_MEMBER_2',
    location_id: 'LOCATION_1',
    state: 'COMPLETED',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    line_items: [
      {
        uid: 'line_item_membership_2',
        catalog_object_id: membershipCatalogItemId,
        catalog_object_variant_id: membershipVariantId,
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
  
  // Membership order for CUSTOMER_MEMBER_3 (Mary Johnson)
  mockService.addOrder({
    id: 'ORDER_MEMBERSHIP_MEMBER_3',
    customer_id: 'CUSTOMER_MEMBER_3',
    location_id: 'LOCATION_1',
    state: 'COMPLETED',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
    line_items: [
      {
        uid: 'line_item_membership_3',
        catalog_object_id: membershipCatalogItemId,
        catalog_object_variant_id: membershipVariantId,
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

