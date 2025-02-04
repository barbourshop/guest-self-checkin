const { SQUARE_API_CONFIG } = require('../config/square');
const crypto = require('crypto');

class WaiverService {
  async checkStatus(customerId) {
    // console.log('Checking Waiver Status for customerId', customerId);
    try {
      const response = await fetch(
        `${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}/custom-attributes/waiver-signed`,
        {
          method: 'GET',
          headers: SQUARE_API_CONFIG.headers
        }
      );
      
      return response.status !== 404;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

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
}

module.exports = new WaiverService();