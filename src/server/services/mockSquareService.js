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
   */
  async searchCustomers(searchType, searchValue) {
    await this._checkFailure('search');
    
    const results = [];
    for (const customer of this.customers.values()) {
      let matches = false;
      if (searchType === 'email' && customer.email_address?.includes(searchValue)) {
        matches = true;
      } else if (searchType === 'phone' && customer.phone_number?.includes(searchValue)) {
        matches = true;
      } else if (searchType === 'lot' && customer.reference_id === searchValue) {
        matches = true;
      } else if (searchType === 'name') {
        const fullName = `${customer.given_name || ''} ${customer.family_name || ''}`.toLowerCase();
        if (fullName.includes(searchValue.toLowerCase())) {
          matches = true;
        }
      }
      
      if (matches) {
        results.push(customer);
      }
    }
    
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
   * Mock check membership by segment (legacy method)
   */
  async checkMembershipBySegment(customerId) {
    await this._checkFailure('checkMembershipBySegment');
    
    const customer = this.customers.get(customerId);
    if (!customer) {
      return false;
    }
    // Check if customer has membership segment
    return customer.segment_ids?.includes('MEMBERSHIP_SEGMENT_ID') || false;
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

