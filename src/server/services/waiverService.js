const { SQUARE_API_CONFIG } = require('../config/square');
const crypto = require('crypto');

/**
 * Service for managing customer waiver status in Square API
 * @class WaiverService
 */
class WaiverService {
  /**
   * Check if a customer has signed the waiver
   * @param {string} customerId - Square customer ID
   * @returns {Promise<boolean>} True if waiver is signed, false otherwise
   * @throws {Error} If API request fails (except 404)
   * @example
   * const hasWaiver = await waiverService.checkStatus('CUSTOMER_ID')
   */
  async checkStatus(customerId) {
    try {
      const response = await fetch(
        `${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}/custom-attributes/waiver-signed`,
        {
          method: 'GET',
          headers: SQUARE_API_CONFIG.headers
        }
      );
      
      if (response.status === 404) {
        return false;
      }
      
      if (!response.ok) {
        throw new Error('Failed to check waiver status');
      }

      const data = await response.json();
      // Check if the waiver was signed within the last year
      const waiverDate = new Date(data.custom_attribute.value);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      return waiverDate > oneYearAgo;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Set waiver status for a customer
   * @param {string} customerId - Square customer ID
   * @returns {Promise<Object>} Square API response
   * @throws {Error} If API request fails
   * @example
   * await waiverService.setStatus('CUSTOMER_ID')
   * 
   * @note Uses UUID for idempotency key to prevent duplicate submissions
   * @note Stores timestamp as waiver signature date
   */
  async setStatus(customerId) {
    const timestamp = new Date().toLocaleString();
    const idempotencyKey = crypto.randomUUID();

    try {
      console.log(`[SET WAIVER STATUS] Attempting to set waiver for customer ${customerId}`);
      const response = await fetch(
        `${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}/custom-attributes/waiver-signed`,
        {
          method: 'POST',
          headers: SQUARE_API_CONFIG.headers,
          body: JSON.stringify({
            idempotency_key: idempotencyKey,
            custom_attribute: {
              key: "waiver-signed",
              value: timestamp
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[SET WAIVER STATUS ERROR] Response status: ${response.status}`, errorData);
        throw new Error(errorData.errors?.[0]?.detail || 'Failed to set waiver status');
      }

      const result = await response.json();
      console.log(`[SET WAIVER STATUS SUCCESS] Customer ${customerId}`, result);
      return result;
    } catch (error) {
      console.error(`[SET WAIVER STATUS ERROR] Customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Clear waiver status for a customer
   * @param {string} customerId - Square customer ID
   * @returns {Promise<boolean>} True if successful, false otherwise
   * @throws {Error} If API request fails
   * @example
   * await waiverService.clearStatus('CUSTOMER_ID')
   */
  async clearStatus(customerId) {
    try {
      console.log(`[CLEAR WAIVER STATUS] Attempting to clear waiver for customer ${customerId}`);
      const response = await fetch(
        `${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}/custom-attributes/waiver-signed`,
        {
          method: 'DELETE',
          headers: SQUARE_API_CONFIG.headers
        }
      );
      
      if (response.status === 404) {
        console.log(`[CLEAR WAIVER STATUS] No waiver found for customer ${customerId}`);
        return true;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[CLEAR WAIVER STATUS ERROR] Response status: ${response.status}`, errorData);
        throw new Error(errorData.errors?.[0]?.detail || 'Failed to clear waiver status');
      }
      
      console.log(`[CLEAR WAIVER STATUS SUCCESS] Customer ${customerId}`);
      return true;
    } catch (error) {
      console.error(`[CLEAR WAIVER STATUS ERROR] Customer ${customerId}:`, error);
      throw error;
    }
  }
}

module.exports = new WaiverService();