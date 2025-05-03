const { SQUARE_API_CONFIG } = require('../config/square');
const crypto = require('crypto');
const logger = require('../logger');

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
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const response = await fetch(
        `${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}/custom-attributes/waiver-signed`,
        {
          method: 'GET',
          headers: SQUARE_API_CONFIG.headers
        }
      ).catch(error => {
        logger.error(`Network error checking waiver status: ${error.message}`);
        throw new Error('Failed to connect to Square API');
      });
      
      if (response.status === 404) {
        return false;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        logger.error(`Square API error checking waiver status: ${JSON.stringify(errorData)}`);
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
      logger.error(`Error in checkStatus: ${error.message}`);
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
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    const timestamp = new Date().toISOString();
    const idempotencyKey = crypto.randomUUID();

    try {
      logger.info(`[SET WAIVER STATUS] Attempting to set waiver for customer ${customerId}`);
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
      ).catch(error => {
        logger.error(`Network error setting waiver status: ${error.message}`);
        throw new Error('Failed to connect to Square API');
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error(`[SET WAIVER STATUS ERROR] Response status: ${response.status}`, errorData);
        throw new Error(errorData.errors?.[0]?.detail || 'Failed to set waiver status');
      }

      const result = await response.json();
      logger.info(`[SET WAIVER STATUS SUCCESS] Customer ${customerId}`);
      return result;
    } catch (error) {
      logger.error(`[SET WAIVER STATUS ERROR] Customer ${customerId}: ${error.message}`);
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
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    try {
      logger.info(`[CLEAR WAIVER STATUS] Attempting to clear waiver for customer ${customerId}`);
      const response = await fetch(
        `${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}/custom-attributes/waiver-signed`,
        {
          method: 'DELETE',
          headers: SQUARE_API_CONFIG.headers
        }
      ).catch(error => {
        logger.error(`Network error clearing waiver status: ${error.message}`);
        throw new Error('Failed to connect to Square API');
      });
      
      if (response.status === 404) {
        logger.info(`[CLEAR WAIVER STATUS] No waiver found for customer ${customerId}`);
        return true;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        logger.error(`[CLEAR WAIVER STATUS ERROR] Response status: ${response.status}`, errorData);
        throw new Error(errorData.errors?.[0]?.detail || 'Failed to clear waiver status');
      }
      
      logger.info(`[CLEAR WAIVER STATUS SUCCESS] Customer ${customerId}`);
      return true;
    } catch (error) {
      logger.error(`[CLEAR WAIVER STATUS ERROR] Customer ${customerId}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new WaiverService();