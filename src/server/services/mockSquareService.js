/**
 * Mock Square Service for testing
 * Provides configurable responses for Square API endpoints
 */
class MockSquareService {
  constructor() {
    // Default test data
    this.customers = new Map();
    this.orders = new Map();
    this.shouldFail = false;
    this.failOnMethod = null; // 'search', 'getOrder', 'searchOrders', etc.
    this.networkDelay = 0;
  }

  /**
   * Configure mock to simulate network failure
   */
  setShouldFail(shouldFail, method = null) {
    this.shouldFail = shouldFail;
    this.failOnMethod = method;
  }

  /**
   * Set network delay simulation
   */
  setNetworkDelay(delay) {
    this.networkDelay = delay;
  }

  /**
   * Add a test customer
   */
  addCustomer(customer) {
    this.customers.set(customer.id, customer);
  }

  /**
   * Add a test order
   */
  addOrder(order) {
    this.orders.set(order.id, order);
  }

  /**
   * Clear all test data
   */
  reset() {
    this.customers.clear();
    this.orders.clear();
    this.shouldFail = false;
    this.failOnMethod = null;
    this.networkDelay = 0;
  }

  async _simulateDelay() {
    if (this.networkDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.networkDelay));
    }
  }

  async _checkFailure(method) {
    await this._simulateDelay();
    if (this.shouldFail && (this.failOnMethod === null || this.failOnMethod === method)) {
      throw new Error(`Mock Square API failure: ${method}`);
    }
  }

  /**
   * Mock customer search
   * Note: Mock service always uses fuzzy matching (contains search) regardless of fuzzy parameter
   * @param {string} searchType - Type of search
   * @param {string} searchValue - Value to search for
   * @param {boolean} fuzzy - Whether to use fuzzy matching (ignored in mock, always fuzzy)
   */
  async searchCustomers(searchType, searchValue, fuzzy = true) {
    await this._checkFailure('search');
    
    const fs = require('fs');
    const logPath = '/Users/mbarbo000/Documents/Projects/guest-self-checkin/.cursor/debug.log';
    
    // #region agent log
    fs.appendFileSync(logPath, JSON.stringify({location:'mockSquareService.js:searchCustomers:entry',message:'Mock search called',data:{searchType,searchValue,totalCustomers:this.customers.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'}) + '\n');
    // #endregion
    
    const results = [];
    const searchLower = searchValue.toLowerCase();
    
    for (const customer of this.customers.values()) {
      let matches = false;
      
      if (searchType === 'email' && customer.email_address?.toLowerCase().includes(searchLower)) {
        matches = true;
      } else if (searchType === 'phone') {
        // Normalize phone numbers for comparison
        const customerPhone = customer.phone_number?.replace(/\D/g, '');
        const searchPhone = searchValue.replace(/\D/g, '');
        if (customerPhone?.includes(searchPhone)) {
          matches = true;
        }
      } else if (searchType === 'lot') {
        // Normalize lot numbers (remove spaces, case insensitive)
        // Use fuzzy matching: check if search value is contained in lot number
        const customerLot = customer.reference_id?.replace(/\s/g, '').toLowerCase();
        const searchLot = searchValue.replace(/\s/g, '').toLowerCase();
        if (customerLot?.includes(searchLot)) {
          matches = true;
        }
      } else if (searchType === 'name') {
        // Check both given_name and family_name separately and together
        const givenName = (customer.given_name || '').toLowerCase();
        const familyName = (customer.family_name || '').toLowerCase();
        const fullName = `${givenName} ${familyName}`.trim();
        
        // #region agent log
        fs.appendFileSync(logPath, JSON.stringify({location:'mockSquareService.js:searchCustomers:name-check',message:'Checking name match',data:{customerId:customer.id,givenName,familyName,fullName,searchLower},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'}) + '\n');
        // #endregion
        
        const givenMatch = givenName.includes(searchLower);
        const familyMatch = familyName.includes(searchLower);
        const fullMatch = fullName.includes(searchLower);
        
        if (givenMatch || familyMatch || fullMatch) {
          matches = true;
          // #region agent log
          fs.appendFileSync(logPath, JSON.stringify({location:'mockSquareService.js:searchCustomers:name-match',message:'Name match found',data:{customerId:customer.id,givenMatch,familyMatch,fullMatch},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'}) + '\n');
          // #endregion
        }
      } else if (searchType === 'address') {
        // Address search - check all address fields
        const address = customer.address || {};
        const addressStr = [
          address.address_line_1,
          address.address_line_2,
          address.locality,
          address.administrative_district_level_1,
          address.postal_code
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (addressStr.includes(searchLower)) {
          matches = true;
        }
      }
      
      if (matches) {
        results.push(customer);
      }
    }
    
    // #region agent log
    fs.appendFileSync(logPath, JSON.stringify({location:'mockSquareService.js:searchCustomers:exit',message:'Mock search complete',data:{searchType,searchValue,resultsCount:results.length,resultIds:results.map(r => r.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'}) + '\n');
    // #endregion
    
    return results;
  }

  /**
   * Mock get customer by ID
   */
  async getCustomer(customerId) {
    await this._checkFailure('getCustomer');
    
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  /**
   * Mock get order by ID
   */
  async getOrder(orderId) {
    await this._checkFailure('getOrder');
    
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * Mock get customer orders
   */
  async getCustomerOrders(customerId) {
    await this._checkFailure('getCustomerOrders');
    
    const results = [];
    for (const order of this.orders.values()) {
      if (order.customer_id === customerId) {
        results.push(order);
      }
    }
    return results;
  }

  /**
   * Mock search orders
   */
  async searchOrders(customerIds, locationIds) {
    await this._checkFailure('searchOrders');
    
    const results = [];
    for (const order of this.orders.values()) {
      if (order.customer_id && customerIds.includes(order.customer_id)) {
        results.push(order);
      }
    }
    return results;
  }

  /**
   * Mock search customers by segment (returns customer IDs in the segment)
   */
  async searchCustomersBySegment(segmentId) {
    await this._checkFailure('searchCustomersBySegment');
    if (!segmentId) {
      throw new Error('Segment ID is required');
    }
    const ids = [];
    for (const [id, customer] of this.customers) {
      if (customer.segment_ids?.includes(segmentId)) {
        ids.push(id);
      }
    }
    return ids;
  }

  /**
   * Mock check membership by segment
   */
  async checkMembershipBySegment(customerId) {
    await this._checkFailure('checkMembershipBySegment');
    
    const customer = this.customers.get(customerId);
    if (!customer) {
      return false;
    }
    // Check if customer has membership segment (mock data uses 'MEMBERSHIP_SEGMENT_ID')
    const { getMembershipSegmentId } = require('../config/square');
    const segmentId = getMembershipSegmentId();
    return customer.segment_ids?.includes(segmentId) || customer.segment_ids?.includes('MEMBERSHIP_SEGMENT_ID') || false;
  }

  /**
   * Mock check membership by catalog item/variant
   */
  async checkMembershipByCatalogItem(customerId, catalogItemId, variantId) {
    await this._checkFailure('checkMembershipByCatalogItem');
    
    // Get all orders for this customer
    const orders = [];
    for (const order of this.orders.values()) {
      if (order.customer_id === customerId) {
        orders.push(order);
      }
    }
    
    // Check if any order contains the membership catalog item/variant
    for (const order of orders) {
      if (order.line_items) {
        for (const item of order.line_items) {
          if (item.catalog_object_id === catalogItemId) {
            // If variantId is specified, check it matches
            if (variantId) {
              if (item.catalog_object_variant_id === variantId) {
                return true;
              }
            } else {
              // Just check catalog item
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Mock verify check-in order
   */
  async verifyCheckinOrder(orderId, checkinCatalogItemId, checkinVariantId) {
    await this._checkFailure('verifyCheckinOrder');
    
    const order = this.orders.get(orderId);
    if (!order) {
      return { valid: false, reason: 'Order not found' };
    }
    
    if (!order.line_items || order.line_items.length === 0) {
      return { valid: false, reason: 'Order has no line items' };
    }
    
    // Check if order contains the check-in catalog item/variant
    for (const item of order.line_items) {
      if (item.catalog_object_id === checkinCatalogItemId) {
        if (checkinVariantId) {
          if (item.catalog_object_variant_id === checkinVariantId) {
            return { valid: true, order };
          }
        } else {
          return { valid: true, order };
        }
      }
    }
    
    return { valid: false, reason: 'Order does not contain required check-in item' };
  }
}

module.exports = MockSquareService;

