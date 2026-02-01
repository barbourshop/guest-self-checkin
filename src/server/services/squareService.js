const { 
  SQUARE_API_CONFIG, 
  POOL_PASS_CATALOG_IDS, 
  MEMBERSHIP_SEGMENT_ID,
  getMembershipSegmentId,
  getMembershipCatalogItemId,
  getMembershipVariantId,
  getCheckinCatalogItemId,
  getCheckinVariantId,
  // Backward compatibility
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

          const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/customers/search`, {
            method: 'POST',
            headers: SQUARE_API_CONFIG.headers,
            body: JSON.stringify(searchParams)
          });

          if (response.ok) {
            const data = await response.json();

            if (data.customers && data.customers.length > 0) {
              allCustomers.push(...data.customers);
            }
          }
        } catch (error) {
          // Log but continue to try other fields
          logger.warn(`Error searching by ${field}: ${error.message}`);
        }
      }

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

    return enrichedCustomers;
  }

  /**
   * Search for all customers in a Square customer segment (no limit; paginates until complete).
   * Uses SearchCustomers with segment_ids filter; follows cursor to return every customer in the segment.
   * @param {string} segmentId - Square segment ID (e.g. gv2:8F7ZZE81CS3W745SDBTJHDAVNG)
   * @returns {Promise<Object[]>} Array of full customer objects from the segment (no extra API calls)
   * @throws {Error} If API request fails
   */
  async searchCustomersBySegment(segmentId) {
    if (!segmentId) {
      throw new Error('Segment ID is required');
    }
    const allCustomers = [];
    let cursor = undefined;
    let page = 0;
    const query = {
      filter: {
        segment_ids: {
          any: [segmentId]
        }
      }
    };
    do {
      page += 1;
      const body = { query, limit: 100 };
      if (cursor) body.cursor = cursor;
      if (page === 1) body.count = true; // Get total match count on first request
      const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/customers/search`, {
        method: 'POST',
        headers: SQUARE_API_CONFIG.headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        let errorDetail = `Square API customer search failed (HTTP ${response.status})`;
        try {
          const errorData = await response.json();
          const sqErr = errorData.errors?.[0];
          if (sqErr) {
            errorDetail = sqErr.detail || errorDetail;
            if (sqErr.code) logger.error(`Square error code: ${sqErr.code}`);
          }
          logger.error(`Square customers/search: ${response.status} ${response.statusText}`);
          if (response.status === 401) {
            const tokenLen = (SQUARE_API_CONFIG.headers.Authorization || '').replace(/^Bearer\s+/i, '').length;
            logger.error(`Square 401: Bearer token length sent = ${tokenLen} (expected 84 for your token; extra chars = wrong)`);
          }
        } catch (_) {
          // response body may not be JSON
        }
        throw new Error(errorDetail);
      }

      const data = await response.json();
      const customers = data.customers || [];
      for (const c of customers) {
        if (c && c.id) allCustomers.push(c);
      }
      if (page === 1 && data.count != null) {
        logger.info(`Segment ${segmentId}: Square reports ${data.count} total matching customers`);
      }
      logger.info(`Segment ${segmentId}: page ${page} returned ${customers.length} customers (total so far: ${allCustomers.length})`);
      // Cursor may be at data.cursor or data.next_cursor; empty string means no more
      const nextCursor = data.cursor ?? data.next_cursor ?? '';
      cursor = (typeof nextCursor === 'string' && nextCursor.length > 0) ? nextCursor : undefined;
    } while (cursor);

    logger.info(`Segment ${segmentId}: finished with ${allCustomers.length} customers`);
    return allCustomers;
  }

  /**
   * Check if a customer has active membership (in any configured segment).
   * @param {string} customerId - Square customer ID
   * @returns {Promise<boolean>} True if customer is in at least one configured segment
   */
  async checkMembershipBySegment(customerId) {
    try {
      const SegmentService = require('./segmentService');
      const segmentService = new SegmentService();
      const configuredIds = segmentService.getConfiguredSegmentIds();
      if (configuredIds.length === 0) return false;
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
      const customerSegmentIds = customer.segment_ids || [];
      return customerSegmentIds.some(id => configuredIds.includes(id));
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
      const SegmentService = require('./segmentService');
      const segmentService = new SegmentService();
      const configuredIds = segmentService.getConfiguredSegmentIds();
      const customerSegmentIds = data.customer.segment_ids || [];
      const hasMembership = configuredIds.length > 0 && customerSegmentIds.some(id => configuredIds.includes(id));
      
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
        
        // Include status code in error for better error handling
        const error = new Error(errorMessage);
        error.status = response.status;
        error.statusCode = response.status;
        
        logger.error(`Square API error fetching orders for customer ${customerId}: ${response.status} ${errorMessage}`);
        throw error;
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
   * @deprecated Membership is now derived from customer segment only. Use checkMembershipBySegment.
   * Kept for backward compatibility; delegates to checkMembershipBySegment.
   */
  async checkMembershipByCatalogItem(customerId) {
    return this.checkMembershipBySegment(customerId);
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

if (USE_MOCK) {
  module.exports = createMockSquareService();
} else {
  module.exports = new SquareService();
}