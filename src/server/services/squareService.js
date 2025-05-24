const { 
  SQUARE_API_CONFIG, 
  POOL_PASS_CATALOG_IDS, 
  MEMBERSHIP_SEGMENT_ID 
} = require('../config/square');
const logger = require('../logger');

/**
 * Service for interacting with Square API customer and order endpoints
 * @class SquareService
 */
class SquareService {
  /**
   * Search for customers by email or phone number
   * @param {'email' | 'phone'} searchType - Type of search to perform
   * @param {string} searchValue - Value to search for
   * @returns {Promise<Array<Object>>} Array of customer objects from Square API
   * @throws {Error} If search type is invalid or API request fails
   * @example
   * await squareService.searchCustomers('email', 'john@example.com')
   * await squareService.searchCustomers('phone', '555-0123')
   */
  async searchCustomers(searchType, searchValue) {
    if (!['email', 'phone', 'lot'].includes(searchType)) {
      throw new Error('Invalid search type. Must be either email, phone, or lot');
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
    const searchParams = {
      query: {
      filter: {
        [searchType === 'email' ? 'email_address' : searchType === 'phone' ? 'phone_number' : 'reference_id']: {
        fuzzy: searchValue
        }
      }
      },
      "limit": 5
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
    const customers = data.customers || [];

    // Enrich each customer with membership status based on segment
    const enrichedCustomers = await Promise.all(
      customers.map(async (customer) => {
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
      throw new Error('Failed to fetch orders');
    }
    const data = await response.json();
    return data.orders || [];
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
}

module.exports = new SquareService();