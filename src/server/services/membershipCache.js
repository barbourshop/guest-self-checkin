const { initDatabase } = require('../db/database');
const squareService = require('./squareService');
const {
  MEMBERSHIP_CATALOG_ITEM_ID,
  MEMBERSHIP_VARIANT_ID,
  CACHE_TTL_HOURS
} = require('../config/square');
const logger = require('../logger');

/**
 * Service for managing membership cache
 * Caches membership status to avoid expensive Square API calls
 */
class MembershipCache {
  constructor(db = null) {
    this.db = db || initDatabase();
    this.cacheTTLHours = CACHE_TTL_HOURS;
  }

  /**
   * Get membership status for a customer
   * Checks cache first, refreshes from Square if cache miss or stale
   * @param {string} customerId - Square customer ID
   * @param {boolean} forceRefresh - Force refresh from Square API
   * @returns {Promise<{hasMembership: boolean, fromCache: boolean}>}
   */
  async getMembershipStatus(customerId, forceRefresh = false) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = this._getFromCache(customerId);
      if (cached) {
        // Check if cache is still valid
        if (this._isCacheValid(cached.last_verified_at)) {
          return {
            hasMembership: cached.has_membership === 1,
            fromCache: true,
            catalogItemId: cached.membership_catalog_item_id,
            variantId: cached.membership_variant_id,
            membershipOrderId: cached.membership_order_id || null
          };
        }
        // Cache is stale, will refresh below
      }
    }

    // Cache miss or stale - refresh from Square
    return this.refreshMembership(customerId);
  }

  /**
   * Refresh membership status from Square API and update cache
   * @param {string} customerId - Square customer ID
   * @returns {Promise<{hasMembership: boolean, fromCache: boolean}>}
   */
  async refreshMembership(customerId) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    try {
      // Check membership using catalog item/variant if configured
      let hasMembership = false;
      let catalogItemId = null;
      let variantId = null;
      let membershipOrderId = null;

      if (MEMBERSHIP_CATALOG_ITEM_ID) {
        hasMembership = await squareService.checkMembershipByCatalogItem(
          customerId,
          MEMBERSHIP_CATALOG_ITEM_ID,
          MEMBERSHIP_VARIANT_ID
        );
        catalogItemId = MEMBERSHIP_CATALOG_ITEM_ID;
        variantId = MEMBERSHIP_VARIANT_ID;
        
        // If membership found, get the membership order ID
        if (hasMembership) {
          try {
            const orders = await squareService.getCustomerOrders(customerId);
            // Find the most recent membership order
            const membershipOrder = orders
              .filter(order => {
                if (!order.line_items || order.line_items.length === 0) return false;
                return order.line_items.some(item => 
                  item.catalog_object_id === MEMBERSHIP_CATALOG_ITEM_ID
                );
              })
              .sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA; // Most recent first
              })[0];
            
            if (membershipOrder) {
              membershipOrderId = membershipOrder.id;
            }
          } catch (error) {
            logger.debug(`Could not fetch membership order ID for ${customerId}: ${error.message}`);
            // Continue without order ID
          }
        }
      } else {
        // Fallback to segment-based checking
        hasMembership = await squareService.checkMembershipBySegment(customerId);
      }

      // Update cache
      this._updateCache(customerId, hasMembership, catalogItemId, variantId, membershipOrderId);

      return {
        hasMembership,
        fromCache: false,
        catalogItemId,
        variantId,
        membershipOrderId
      };
    } catch (error) {
      logger.error(`Error refreshing membership for ${customerId}:`, error);
      
      // On error, try to return cached value if available
      const cached = this._getFromCache(customerId);
      if (cached) {
        logger.warn(`Using stale cache for ${customerId} due to refresh error`);
        return {
          hasMembership: cached.has_membership === 1,
          fromCache: true,
          catalogItemId: cached.membership_catalog_item_id,
          variantId: cached.membership_variant_id,
          membershipOrderId: cached.membership_order_id || null
        };
      }
      
      // No cache available, rethrow error
      throw error;
    }
  }

  /**
   * Invalidate cache entry for a customer
   * @param {string} customerId - Square customer ID
   */
  invalidateCache(customerId) {
    if (!customerId) {
      return;
    }

    try {
      this.db.prepare(`
        DELETE FROM membership_cache WHERE customer_id = ?
      `).run(customerId);
    } catch (error) {
      logger.error(`Error invalidating cache for ${customerId}:`, error);
    }
  }

  /**
   * Refresh membership for multiple customers
   * @param {string[]} customerIds - Array of customer IDs
   * @returns {Promise<Array<{customerId: string, hasMembership: boolean}>>}
   */
  async bulkRefresh(customerIds) {
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return [];
    }

    const results = [];
    for (const customerId of customerIds) {
      try {
        const status = await this.refreshMembership(customerId);
        results.push({
          customerId,
          hasMembership: status.hasMembership
        });
      } catch (error) {
        logger.error(`Error refreshing membership for ${customerId} in bulk:`, error);
        results.push({
          customerId,
          hasMembership: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get membership status from cache
   * @private
   */
  _getFromCache(customerId) {
    try {
      const result = this.db.prepare(`
        SELECT * FROM membership_cache WHERE customer_id = ?
      `).get(customerId);

      return result || null;
    } catch (error) {
      logger.error(`Error reading from cache for ${customerId}:`, error);
      return null;
    }
  }

  /**
   * Update cache with membership status
   * @private
   */
  _updateCache(customerId, hasMembership, catalogItemId = null, variantId = null, membershipOrderId = null) {
    try {
      const lastVerified = new Date().toISOString();

      // Check if membership_order_id column exists (for migration compatibility)
      let hasOrderIdColumn = false;
      try {
        const tableInfo = this.db.prepare(`PRAGMA table_info(membership_cache)`).all();
        hasOrderIdColumn = tableInfo.some(col => col.name === 'membership_order_id');
      } catch (error) {
        // If table doesn't exist yet, it will be created with the column
        hasOrderIdColumn = true;
      }

      if (hasOrderIdColumn) {
        this.db.prepare(`
          INSERT INTO membership_cache 
          (customer_id, has_membership, membership_catalog_item_id, membership_variant_id, membership_order_id, last_verified_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(customer_id) DO UPDATE SET
            has_membership = ?,
            membership_catalog_item_id = ?,
            membership_variant_id = ?,
            membership_order_id = ?,
            last_verified_at = ?
        `).run(
          customerId,
          hasMembership ? 1 : 0,
          catalogItemId,
          variantId,
          membershipOrderId,
          lastVerified,
          hasMembership ? 1 : 0,
          catalogItemId,
          variantId,
          membershipOrderId,
          lastVerified
        );
      } else {
        // Fallback for old schema without membership_order_id
        this.db.prepare(`
          INSERT INTO membership_cache 
          (customer_id, has_membership, membership_catalog_item_id, membership_variant_id, last_verified_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(customer_id) DO UPDATE SET
            has_membership = ?,
            membership_catalog_item_id = ?,
            membership_variant_id = ?,
            last_verified_at = ?
        `).run(
          customerId,
          hasMembership ? 1 : 0,
          catalogItemId,
          variantId,
          lastVerified,
          hasMembership ? 1 : 0,
          catalogItemId,
          variantId,
          lastVerified
        );
      }
    } catch (error) {
      logger.error(`Error updating cache for ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Check if cache entry is still valid
   * @private
   */
  _isCacheValid(lastVerifiedAt) {
    if (!lastVerifiedAt) {
      return false;
    }

    const lastVerified = new Date(lastVerifiedAt);
    const now = new Date();
    const hoursSinceVerification = (now - lastVerified) / (1000 * 60 * 60);

    return hoursSinceVerification < this.cacheTTLHours;
  }

  /**
   * Close database connection (for testing)
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = MembershipCache;

