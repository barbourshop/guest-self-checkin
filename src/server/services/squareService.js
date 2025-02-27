const { 
  SQUARE_API_CONFIG, 
  POOL_PASS_CATALOG_IDS, 
  MEMBERSHIP_ATTRIBUTE_KEY 
} = require('../config/square');

/**
 * Service for interacting with Square API customer and order endpoints
 * @class SquareService
 */
class SquareService {
  /**
   * Search for customers by email or phone number
   * @param {'email' | 'phone'} searchType - Type of search to perform
   * @param {string} searchValue - Value to search for
   * @returns {Promise<Array<Object>>} Array of enriched customer objects
   * @throws {Error} If search type is invalid or API request fails
   * @example
   * await squareService.searchCustomers('email', 'john@example.com')
   * await squareService.searchCustomers('phone', '555-0123')
   */
  async searchCustomers(searchType, searchValue) {
    if (!['email', 'phone'].includes(searchType)) {
      throw new Error('Invalid search type. Must be either email or phone');
    }

    const searchParams = {
      query: {
        filter: {
          [searchType === 'email' ? 'email_address' : 'phone_number']: {
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
    
    // Process each customer, even if there are multiple matches
    const customersWithMembership = await Promise.all((data.customers || []).map(
      customer => this.enrichCustomerData(customer)
    ));

    return customersWithMembership;
  }

  /**
   * Enrich customer data with membership status
   * @param {Object} customer - Square customer object
   * @returns {Promise<Object>} Customer object with membership status
   * @example
   * const enrichedCustomer = await squareService.enrichCustomerData(customer)
   */
  async enrichCustomerData(customer) {
    try {
      const hasMembership = await this.checkMembershipStatus(customer.id);
      return {
        ...customer,
        membershipStatus: hasMembership ? 'Member' : 'Non-Member'
      };
    } catch (error) {
      console.error(`Error enriching customer data for ID ${customer.id}:`, error);
      return {
        ...customer,
        membershipStatus: 'Non-Member'
      };
    }
  }

  async checkMembershipStatus(customerId) {
    try {
      console.log('Request URL', `${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}/custom-attributes/${MEMBERSHIP_ATTRIBUTE_KEY}`);
      
      const response = await fetch(
        `${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}/custom-attributes/${MEMBERSHIP_ATTRIBUTE_KEY}`,
        {
          method: 'GET',
          headers: SQUARE_API_CONFIG.headers
        }
      );
      
      // First check if the response is OK
      if (!response.ok) {
        // Only read the error data if not OK
        const errorData = await response.json();
        console.error('Error response:', errorData);
        return false; // Return false for non-OK responses
      }
      
      // If we get here, the response was successful
      const data = await response.json();
      console.log('Attribute data:', data);
      
      // Check if the attribute exists
      return true; // Since response.status is 200
      
    } catch (error) {
      console.error(`Error checking membership for ${customerId}:`, error);
      
      // Handle 404 errors specifically
      if (error.response?.status === 404 || error.status === 404) {
        return false;
      }
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
}

module.exports = new SquareService();