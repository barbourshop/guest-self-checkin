const squareService = require('./squareService');
const waiverService = require('./waiverService');
const MembershipCache = require('./membershipCache');

/**
 * Service handling customer-related operations
 * @class CustomerService
 */
class CustomerService {
  constructor() {
    this.membershipCache = new MembershipCache();
  }

  /**
   * Get customer by ID with enriched data
   * @param {string} customerId - The customer ID
   * @returns {Promise<Object|null>} The enriched customer object or null if not found
   */
  async getCustomerById(customerId) {
    try {
      // Get the raw customer data from Square API
      const customer = await squareService.getCustomer(customerId);
      
      // Check membership status using cache
      const membershipStatus = await this.membershipCache.getMembershipStatus(customerId);
      const hasMembership = membershipStatus.hasMembership;
      
      // Check waiver status
      const hasSignedWaiver = await waiverService.checkStatus(customerId);
      
      // Enrich the customer data with membership and waiver status
      return {
        ...customer,
        membershipType: hasMembership ? 'Member' : 'Non-Member',
        hasSignedWaiver
      };
    } catch (error) {
      console.error('Error getting customer by ID:', error);
      return null;
    }
  }

  /**
   * Search for customers with enriched data
   * Supports: email, phone, lot, name, address
   * @param {string} searchType - Type of search (email, phone, lot, name, address)
   * @param {string} searchValue - Value to search for
   * @returns {Promise<Array<Object>>} Array of enriched customer objects
   */
  async searchCustomers(searchType, searchValue) {
    try {
      // Get raw customer data from Square API
      const customers = await squareService.searchCustomers(searchType, searchValue);
      
      // Enrich each customer with membership (from cache) and waiver status
      const enrichedCustomers = await Promise.all(
        customers.map(async (customer) => {
          // Use cache for membership status
          const membershipStatus = await this.membershipCache.getMembershipStatus(customer.id);
          const hasMembership = membershipStatus.hasMembership;
          
          // Check waiver status
          const hasSignedWaiver = await waiverService.checkStatus(customer.id);
          
          return {
            ...customer,
            membershipType: hasMembership ? 'Member' : 'Non-Member',
            hasSignedWaiver
          };
        })
      );
      
      return enrichedCustomers;
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  }

  /**
   * Unified search - auto-detects search type from input
   * @param {string} query - Search query (could be email, phone, name, address, lot, or order ID)
   * @returns {Promise<{type: string, results: Array<Object>}>} Search results
   */
  async unifiedSearch(query) {
    if (!query || typeof query !== 'string') {
      return { type: 'search', results: [] };
    }

    const trimmed = query.trim();

    // Check if it looks like an order ID (QR code)
    // Square order IDs are typically alphanumeric and 10+ characters
    const orderIdPattern = /^[A-Z0-9]{10,}$/i;
    if (orderIdPattern.test(trimmed)) {
      // This is a QR code - return special type
      return { type: 'qr', orderId: trimmed, results: [] };
    }

    // Auto-detect search type
    let searchType = 'name'; // Default to name search
    
    // Check for email pattern
    if (trimmed.includes('@') && trimmed.includes('.')) {
      searchType = 'email';
    }
    // Check for phone pattern (digits, possibly with formatting)
    else if (/^[\d\s\-\(\)\+]+$/.test(trimmed) && trimmed.replace(/\D/g, '').length >= 10) {
      searchType = 'phone';
    }
    // Check for lot number pattern (alphanumeric, short)
    else if (/^[A-Z0-9]{1,10}$/i.test(trimmed)) {
      searchType = 'lot';
    }
    // Otherwise treat as name or address
    else if (trimmed.length > 5 && /[A-Za-z]/.test(trimmed)) {
      // Try name first, then address
      searchType = 'name';
    }

    // Perform search
    const results = await this.searchCustomers(searchType, trimmed);
    
    return { type: searchType, results };
  }

  /**
   * Update customer's waiver status
   * @param {string} customerId - The customer ID
   * @param {boolean} hasSignedWaiver - The new waiver status
   * @returns {Promise<boolean>} True if update was successful
   */
  async updateWaiverStatus(customerId, hasSignedWaiver) {
    try {
      if (hasSignedWaiver) {
        // Set waiver as signed
        await waiverService.setStatus(customerId);
      } else {
        // Clear waiver status
        await waiverService.clearStatus(customerId);
      }
      return true;
    } catch (error) {
      console.error('Error updating waiver status:', error);
      return false;
    }
  }
}

module.exports = new CustomerService(); 