const { 
  SQUARE_API_CONFIG, 
  POOL_PASS_CATALOG_IDS, 
  MEMBERSHIP_SEGMENT_ID,
  MEMBERSHIP_CATALOG_ITEM_ID,
  MEMBERSHIP_VARIANT_ID,
  CHECKIN_CATALOG_ITEM_ID,
  CHECKIN_VARIANT_ID
} = require('../config/square');
const logger = require('../logger');
const MockSquareService = require('./mockSquareService');
const { createMockSquareService } = require('../__tests__/helpers/mockSquareHelpers');

/**
 * Service for interacting with Square API customer and order endpoints
 * @class SquareService
 */
class SquareService {
  /**
   * Search for customers by email or phone number
   * @param {'email' | 'phone' | 'lot' | 'name' | 'address'} searchType - Type of search to perform
   * @param {string} searchValue - Value to search for
   * @param {boolean} fuzzy - Whether to use fuzzy matching (default: true)
   * @returns {Promise<Array<Object>>} Array of customer objects from Square API
   * @throws {Error} If search type is invalid or API request fails
   * @example
   * await squareService.searchCustomers('email', 'john@example.com', true)
   * await squareService.searchCustomers('phone', '555-0123', true)
   */
  async searchCustomers(searchType, searchValue, fuzzy = true) {
    if (!['email', 'phone', 'lot', 'name', 'address'].includes(searchType)) {
      throw new Error('Invalid search type. Must be email, phone, lot, name, or address');
    }

    /**
     * Constructs search parameters for querying based on the provided search type and value.
     *
     * @param {string} searchType - The type of search to perform. Can be 'email', 'phone', or 'lot'.
     *                              'email' searches by email address.
     *                              'phone' searches by phone number.
     *                              'lot' searches by reference ID.
     * @param {string} searchValue - The value to search for.
     * @returns {Object} The search parameters object.
     */
    // Build search filter based on type
    let searchParams;
    let allCustomers = [];
    
    if (searchType === 'name') {
      // Name search: Try searching both given_name and family_name
      // Square API may not support fuzzy on name fields, so we'll try exact match
      // and combine results from both fields
      const searchFields = ['given_name', 'family_name'];
      
      const fs = require('fs');
      const logPath = '/Users/mbarbo000/Documents/Projects/guest-self-checkin/.cursor/debug.log';
      
      // #region agent log
      fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:searchCustomers:name-search-start',message:'Starting name search',data:{searchValue,searchFields},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n');
      // #endregion
      
      for (const field of searchFields) {
        try {
          // For name search, use fuzzy if requested, otherwise exact
          // Square API supports text_filter which can do fuzzy matching
          searchParams = {
            query: {
              filter: {
                [field]: fuzzy ? {
                  fuzzy: searchValue
                } : {
                  exact: searchValue
                }
              }
            },
            limit: 5
          };
          
          // #region agent log
          fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:searchCustomers:name-search-using-exact',message:'Using exact match for name search',data:{field,searchValue,note:'Exact match requires full name - this may be why no results'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n');
          // #endregion

          // #region agent log
          fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:searchCustomers:name-search-before-api',message:'About to call Square API',data:{field,searchValue,searchParams},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n');
          // #endregion

          const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/customers/search`, {
            method: 'POST',
            headers: SQUARE_API_CONFIG.headers,
            body: JSON.stringify(searchParams)
          });

          // #region agent log
          fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:searchCustomers:name-search-after-api',message:'Square API response received',data:{field,status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'}) + '\n');
          // #endregion

          if (response.ok) {
            const data = await response.json();
            
            // #region agent log
            fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:searchCustomers:name-search-after-parse',message:'Square API data parsed',data:{field,customersCount:data.customers?.length||0,hasCustomers:!!data.customers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n');
            // #endregion
            
            if (data.customers && data.customers.length > 0) {
              allCustomers.push(...data.customers);
            }
          } else {
            // #region agent log
            const errorText = await response.text().catch(() => 'Unable to read error'); fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:searchCustomers:name-search-api-error',message:'Square API returned error',data:{field,status:response.status,errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'}) + '\n');
            // #endregion
          }
        } catch (error) {
          // #region agent log
          fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:searchCustomers:name-search-exception',message:'Exception during name search',data:{field,error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'}) + '\n');
          // #endregion
          // Log but continue to try other fields
          logger.warn(`Error searching by ${field}: ${error.message}`);
        }
      }
      
      // #region agent log
      fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:searchCustomers:name-search-complete',message:'Name search complete',data:{totalCustomers:allCustomers.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n');
      // #endregion
      
      // Deduplicate customers by ID
      const customerMap = new Map();
      for (const customer of allCustomers) {
        if (!customerMap.has(customer.id)) {
          customerMap.set(customer.id, customer);
        }
      }
      allCustomers = Array.from(customerMap.values());
    } else {
      // For other search types, use field-specific filters
      let filterField;
      if (searchType === 'email') {
        filterField = 'email_address';
      } else if (searchType === 'phone') {
        filterField = 'phone_number';
      } else if (searchType === 'lot') {
        filterField = 'reference_id';
      } else if (searchType === 'address') {
        // Address search - Square API supports address_line_1, locality, etc.
        filterField = 'address_line_1';
      }

      // Use fuzzy matching if requested, otherwise use exact match
      searchParams = {
        query: {
          filter: {
            [filterField]: fuzzy ? {
              fuzzy: searchValue
            } : {
              exact: searchValue
            }
          }
        },
        limit: 5
      };

      const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/customers/search`, {
        method: 'POST',
        headers: SQUARE_API_CONFIG.headers,
        body: JSON.stringify(searchParams)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.detail || 'Square API request failed');
      }

      const data = await response.json();
      allCustomers = data.customers || [];
    }

    const fs = require('fs');
    const logPath = '/Users/mbarbo000/Documents/Projects/guest-self-checkin/.cursor/debug.log';
    
    // #region agent log
    fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:searchCustomers:before-enrichment',message:'Before enrichment',data:{customersCount:allCustomers.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'}) + '\n');
    // #endregion

    // Enrich each customer with membership status based on segment
    const enrichedCustomers = await Promise.all(
      allCustomers.map(async (customer) => {
        const hasMembership = await this.checkMembershipBySegment(customer.id);
        return {
          ...customer,
          membershipType: hasMembership ? 'Member' : 'Non-Member'
        };
      })
    );

    // #region agent log
    fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:searchCustomers:after-enrichment',message:'After enrichment',data:{enrichedCount:enrichedCustomers.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'}) + '\n');
    // #endregion

    return enrichedCustomers;
  }

  /**
   * Check if a customer has an active membership based on segment ID
   * @param {string} customerId - Square customer ID
   * @returns {Promise<boolean>} True if customer has active membership
   */
  async checkMembershipBySegment(customerId) {
    try {
      const response = await fetch(
        `${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}`,
        {
          method: 'GET',
          headers: SQUARE_API_CONFIG.headers
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.detail || 'Failed to get customer');
      }

      const data = await response.json();
      const customer = data.customer;
      return customer.segment_ids?.includes(MEMBERSHIP_SEGMENT_ID) || false;
    } catch (error) {
      console.error(`Error checking membership for ${customerId}:`, error);
      return false;
    }
  }

  /**
   * Get a single customer by ID from Square API
   * @param {string} customerId - The customer ID
   * @returns {Promise<Object>} The customer object from Square API
   * @throws {Error} If the customer is not found or the request fails
   */
  async getCustomer(customerId) {
    const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}`, {
      method: 'GET',
      headers: SQUARE_API_CONFIG.headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.detail || 'Failed to get customer');
    }

    const data = await response.json();
    return data.customer;
  }

  /**
   * Check if a customer has an active membership
   * @param {string} customerId - Square customer ID
   * @returns {Promise<boolean>} True if customer has active membership
   * @throws {Error} If API request fails
   * @example
   * const hasMembership = await squareService.checkMembershipStatus('CUSTOMER_ID')
   */
  async checkMembershipStatus(customerId) {
    try {
      const response = await fetch(
        `${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}`,
        {
          method: 'GET',
          headers: SQUARE_API_CONFIG.headers
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[checkMembershipStatus] Error response:', errorData);
        return false;
      }
      
      const data = await response.json();
      
      // Check if the customer has the membership segment
      const hasMembership = data.customer.segment_ids?.includes(MEMBERSHIP_SEGMENT_ID);
      
      const timestamp = new Date().toISOString();
      console.log(`${timestamp} [ CHECK MEMBERSHIP STATUS ] Customer ID: ${customerId}, Status: ${hasMembership ? 'Member' : 'Non-Member'}`);
      
      return hasMembership;
      
    } catch (error) {
      console.error(`[checkMembershipStatus] Error checking membership for ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all orders for a specific customer
   * @param {string} customerId - Square customer ID
   * @returns {Promise<Array<Object>>} Array of customer orders
   * @throws {Error} If API request fails
   * @example
   * const orders = await squareService.getCustomerOrders('CUSTOMER_ID')
   */
  async getCustomerOrders(customerId) {
    try {
      const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/orders/search`, {
        method: 'POST',
        headers: SQUARE_API_CONFIG.headers,
        body: JSON.stringify({
          query: {
            filter: {
              customer_filter: {
                customer_ids: [customerId]
              }
            }
          },
          location_ids: ["LDH1GBS49SASE"]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch orders from Square API';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.errors?.[0]?.detail || errorData.errors?.[0]?.code || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        logger.error(`Square API error fetching orders for customer ${customerId}: ${response.status} ${errorMessage}`);
        throw new Error(errorMessage);
      }
      const data = await response.json();
      return data.orders || [];
    } catch (error) {
      logger.error(`Error fetching customer orders: ${error.message}`);
      throw error;
    }
  }

  /**
   * List customers with pagination
   * @param {number} limit - Maximum number of customers to return
   * @param {string} cursor - Pagination cursor
   * @returns {Promise<Object>} Response with customers and pagination info
   * @throws {Error} If API request fails
   * @example
   * const { customers, cursor } = await squareService.listCustomers(10)
   */
  async listCustomers(limit = 5, cursor) {
    const url = new URL(`${SQUARE_API_CONFIG.baseUrl}/customers`);
    url.searchParams.append('limit', limit);
    if (cursor) {
      url.searchParams.append('cursor', cursor);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: SQUARE_API_CONFIG.headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.detail || 'Failed to list customers');
    }

    return response.json();
  }

  /**
   * Update a customer's information
   * @param {string} customerId - The customer ID
   * @param {Object} updates - The updates to apply to the customer
   * @returns {Promise<Object>} The updated customer object
   * @throws {Error} If the update fails
   */
  async updateCustomer(customerId, updates) {
    const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}`, {
      method: 'PUT',
      headers: SQUARE_API_CONFIG.headers,
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.detail || 'Failed to update customer');
    }

    const data = await response.json();
    return data.customer;
  }

  /**
   * Fetch all customer data needed for local search from Square
   * @returns {Promise<Array<{id: string, given_name: string, family_name: string, email_address: string, phone_number: string, reference_id: string, segment_ids: string[] }>>}
   */
  async getCustomerNames() {
    let customers = [];
    let cursor = undefined;
    do {
      const url = new URL(`${SQUARE_API_CONFIG.baseUrl}/customers`);
      url.searchParams.append('limit', 100);
      if (cursor) url.searchParams.append('cursor', cursor);
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: SQUARE_API_CONFIG.headers
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.detail || 'Failed to list customers');
      }
      const data = await response.json();
      customers = customers.concat(data.customers || []);
      cursor = data.cursor;
    } while (cursor);
    return customers.map(c => ({
      id: c.id,
      given_name: c.given_name,
      family_name: c.family_name,
      email_address: c.email_address,
      phone_number: c.phone_number,
      reference_id: c.reference_id,
      segment_ids: c.segment_ids || []
    }));
  }

  /**
   * Check if a customer has an active membership based on catalog item/variant purchase
   * @param {string} customerId - Square customer ID
   * @param {string} catalogItemId - Optional catalog item ID (uses config if not provided)
   * @param {string} variantId - Optional variant ID (uses config if not provided)
   * @returns {Promise<boolean>} True if customer has purchased the membership catalog item/variant
   * @throws {Error} If API request fails
   */
  async checkMembershipByCatalogItem(customerId, catalogItemId = null, variantId = null) {
    const membershipCatalogItemId = catalogItemId || MEMBERSHIP_CATALOG_ITEM_ID;
    const membershipVariantId = variantId || MEMBERSHIP_VARIANT_ID;

    if (!membershipCatalogItemId) {
      throw new Error('Membership catalog item ID not configured');
    }

    try {
      // Get all orders for this customer
      const orders = await this.getCustomerOrders(customerId);

      // Check if any order contains the membership catalog item/variant
      for (const order of orders) {
        if (order.line_items && order.line_items.length > 0) {
          for (const item of order.line_items) {
            if (item.catalog_object_id === membershipCatalogItemId) {
              // If variant ID is specified, check it matches
              if (membershipVariantId) {
                // Note: Square API may return variant info in different fields
                // Check both catalog_object_variant_id and variation_name
                if (item.catalog_object_variant_id === membershipVariantId ||
                    item.variation_name === membershipVariantId) {
                  return true;
                }
              } else {
                // Just check catalog item (any variant)
                return true;
              }
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.error(`Error checking membership by catalog item for ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Verify that an order contains the required check-in catalog item/variant
   * @param {string} orderId - Square order ID
   * @param {string} checkinCatalogItemId - Optional catalog item ID (uses config if not provided)
   * @param {string} checkinVariantId - Optional variant ID (uses config if not provided)
   * @returns {Promise<{valid: boolean, order?: Object, reason?: string}>} Validation result
   * @throws {Error} If API request fails
   */
  async verifyCheckinOrder(orderId, checkinCatalogItemId = null, checkinVariantId = null) {
    const catalogItemId = checkinCatalogItemId || CHECKIN_CATALOG_ITEM_ID;
    const variantId = checkinVariantId || CHECKIN_VARIANT_ID;

    if (!catalogItemId) {
      throw new Error('Check-in catalog item ID not configured');
    }

    try {
      // Get order from Square API
      const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: SQUARE_API_CONFIG.headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          valid: false,
          reason: errorData.errors?.[0]?.detail || 'Order not found'
        };
      }

      const data = await response.json();
      const order = data.order;

      if (!order) {
        return { valid: false, reason: 'Order not found' };
      }

      if (!order.line_items || order.line_items.length === 0) {
        return { valid: false, reason: 'Order has no line items' };
      }

      // Check if order contains the check-in catalog item/variant
      for (const item of order.line_items) {
        if (item.catalog_object_id === catalogItemId) {
          if (variantId) {
            // Check variant matches
            if (item.catalog_object_variant_id === variantId ||
                item.variation_name === variantId) {
              return { valid: true, order };
            }
          } else {
            // Just check catalog item (any variant)
            return { valid: true, order };
          }
        }
      }

      return { valid: false, reason: 'Order does not contain required check-in item' };
    } catch (error) {
      console.error(`Error verifying check-in order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Search for customers by name
   * @param {string} name - Name to search for (searches given_name and family_name)
   * @returns {Promise<Array<Object>>} Array of customer objects from Square API
   * @throws {Error} If API request fails
   */
  async searchCustomersByName(name) {
    return this.searchCustomers('name', name);
  }

  /**
   * Search for customers by address
   * @param {string} address - Address to search for
   * @returns {Promise<Array<Object>>} Array of customer objects from Square API
   * @throws {Error} If API request fails
   */
  async searchCustomersByAddress(address) {
    return this.searchCustomers('address', address);
  }

  /**
   * Get order by ID
   * @param {string} orderId - Square order ID
   * @returns {Promise<Object>} Order object from Square API
   * @throws {Error} If order not found or API request fails
   */
  async getOrder(orderId) {
    const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: SQUARE_API_CONFIG.headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.detail || 'Order not found');
    }

    const data = await response.json();
    return data.order;
  }
}

// Use mock service if USE_MOCK_SQUARE_SERVICE is set, otherwise use real service
const USE_MOCK = process.env.USE_MOCK_SQUARE_SERVICE === 'true';

const fs = require('fs');
const logPath = '/Users/mbarbo000/Documents/Projects/guest-self-checkin/.cursor/debug.log';

// #region agent log
fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:module-init',message:'SquareService module initializing',data:{USE_MOCK,envVar:process.env.USE_MOCK_SQUARE_SERVICE},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'}) + '\n');
// #endregion

if (USE_MOCK) {
  const mockService = createMockSquareService();
  // #region agent log
  fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:module-init',message:'Using mock Square service',data:{mockCustomersCount:mockService.customers?.size || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'}) + '\n');
  // #endregion
  module.exports = mockService;
} else {
  // #region agent log
  fs.appendFileSync(logPath, JSON.stringify({location:'squareService.js:module-init',message:'Using real Square service',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'}) + '\n');
  // #endregion
  module.exports = new SquareService();
}