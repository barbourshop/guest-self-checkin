const { SQUARE_API_CONFIG, POOL_PASS_CATALOG_IDS } = require('../config/square');

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
      }
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
    const customersWithOrders = await Promise.all((data.customers || []).map(
      customer => this.enrichCustomerData(customer)
    ));

    return customersWithOrders;
  }

  /**
   * Enrich customer data with orders and membership status
   * @param {Object} customer - Square customer object
   * @returns {Promise<Object>} Customer object with orders and membership status
   * @example
   * const enrichedCustomer = await squareService.enrichCustomerData(customer)
   */
  async enrichCustomerData(customer) {
    const orders = await this.getCustomerOrders(customer.id);
    const hasMembership = orders.some(order => 
      order.line_items?.some(item => 
        POOL_PASS_CATALOG_IDS.includes(item.catalog_object_id)
      )
    );
    return {
      ...customer,
      orders,
      membershipStatus: hasMembership ? 'Member' : 'Non-Member'
    };
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
    //console.log("data.orders", data.orders);
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