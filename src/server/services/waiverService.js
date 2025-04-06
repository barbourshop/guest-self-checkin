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
      throw new Error(errorData.errors?.[0]?.detail || 'Failed to set waiver status');
    }

    return response.json();
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
      const response = await fetch(
        `${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}/custom-attributes/waiver-signed`,
        {
          method: 'DELETE',
          headers: SQUARE_API_CONFIG.headers
        }
      );
      
      // 404 means the attribute doesn't exist, which is fine for clearing
      if (response.status === 404) {
        return true;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.detail || 'Failed to clear waiver status');
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing waiver status:', error);
      return false;
    }
  }
}

module.exports = new WaiverService();