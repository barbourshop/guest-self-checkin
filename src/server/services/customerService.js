const squareService = require('./squareService');
const waiverService = require('./waiverService');

/**
 * Service handling customer-related operations
 * @class CustomerService
 */
class CustomerService {
  /**
   * Get customer by ID with enriched data
   * @param {string} customerId - The customer ID
   * @returns {Promise<Object|null>} The enriched customer object or null if not found
   */
  async getCustomerById(customerId) {
    try {
      // Get the raw customer data from Square API
      const customer = await squareService.getCustomer(customerId);
      
      // Check membership status based on segment
      const hasMembership = await squareService.checkMembershipBySegment(customerId);
      
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
   * @param {string} searchType - Type of search (email, phone, lot)
   * @param {string} searchValue - Value to search for
   * @returns {Promise<Array<Object>>} Array of enriched customer objects
   */
  async searchCustomers(searchType, searchValue) {
    try {
      // Get raw customer data from Square API
      const customers = await squareService.searchCustomers(searchType, searchValue);
      
      // Enrich each customer with membership and waiver status
      const enrichedCustomers = await Promise.all(
        customers.map(async (customer) => {
          const hasMembership = await squareService.checkMembershipBySegment(customer.id);
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