const squareService = require('./squareService');
const membershipCache = require('./membershipCache');
const {
  CHECKIN_CATALOG_ITEM_ID,
  CHECKIN_VARIANT_ID
} = require('../config/square');
const logger = require('../logger');

/**
 * Service for verifying check-in orders
 * Validates that orders contain the required check-in catalog item/variant
 */
const MembershipCacheDefault = require('./membershipCache');

class CheckinVerification {
  constructor(cacheInstance = null) {
    this.membershipCache = cacheInstance || new MembershipCacheDefault();
  }

  /**
   * Verify a check-in order
   * @param {string} orderId - Square order ID (from QR code)
   * @param {Object} options - Verification options
   * @param {boolean} options.checkMembership - Whether to verify membership status (default: true)
   * @returns {Promise<{valid: boolean, reason?: string, order?: Object, customerId?: string, hasMembership?: boolean}>}
   */
  async verifyCheckinOrder(orderId, options = {}) {
    const { checkMembership = true } = options;

    if (!orderId) {
      return {
        valid: false,
        reason: 'Order ID is required'
      };
    }

    if (!CHECKIN_CATALOG_ITEM_ID) {
      logger.error('Check-in catalog item ID not configured');
      return {
        valid: false,
        reason: 'Check-in configuration error'
      };
    }

    try {
      // Verify order contains check-in catalog item/variant
      const verification = await squareService.verifyCheckinOrder(
        orderId,
        CHECKIN_CATALOG_ITEM_ID,
        CHECKIN_VARIANT_ID
      );

      if (!verification.valid) {
        return {
          valid: false,
          reason: verification.reason || 'Order does not contain required check-in item'
        };
      }

      const order = verification.order;
      const customerId = order.customer_id;

      // If no customer ID in order, we can't verify membership
      if (!customerId && checkMembership) {
        return {
          valid: false,
          reason: 'Order does not have associated customer'
        };
      }

      // Check membership status if requested
      let hasMembership = null;
      if (checkMembership && customerId) {
        try {
          const membershipStatus = await this.membershipCache.getMembershipStatus(customerId);
          hasMembership = membershipStatus.hasMembership;
        } catch (error) {
          logger.error(`Error checking membership for ${customerId}:`, error);
          // Continue with check-in even if membership check fails
          // The order validation is the primary check
        }
      }

      return {
        valid: true,
        order,
        customerId,
        hasMembership
      };
    } catch (error) {
      logger.error(`Error verifying check-in order ${orderId}:`, error);
      
      // Determine error reason
      let reason = 'An issue with check-in, please see the manager on duty';
      if (error.message.includes('not found')) {
        reason = 'Order not found';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        reason = 'Network error - please try again';
      }

      return {
        valid: false,
        reason
      };
    }
  }

  /**
   * Validate QR code input
   * Determines if input is a valid order ID format
   * @param {string} input - Input string (could be QR code or search query)
   * @returns {boolean} True if input looks like an order ID
   */
  static isValidOrderIdFormat(input) {
    if (!input || typeof input !== 'string') {
      return false;
    }

    // Square order IDs are typically alphanumeric and 10+ characters
    // They often start with a prefix like "CA" or "ORDER"
    // Basic validation: alphanumeric, 10+ characters
    const orderIdPattern = /^[A-Z0-9]{10,}$/i;
    return orderIdPattern.test(input.trim());
  }

  /**
   * Auto-detect if input is QR code (order ID) or search query
   * @param {string} input - Input string
   * @returns {'qr' | 'search'} Type of input
   */
  static detectInputType(input) {
    if (!input || typeof input !== 'string') {
      return 'search';
    }

    const trimmed = input.trim();

    // Check if it looks like an order ID
    if (CheckinVerification.isValidOrderIdFormat(trimmed)) {
      return 'qr';
    }

    // Otherwise treat as search query
    return 'search';
  }
}

module.exports = CheckinVerification;

