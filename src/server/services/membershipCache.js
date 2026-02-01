const { initDatabase } = require('../db/database');
const squareService = require('./squareService');
const {
  getBulkRefreshConcurrency,
  getBulkRefreshRateLimitMs,
  getBulkRefreshRequestDelayMs,
  getCacheRefreshAgeHours,
  getCacheTTLHours
} = require('../config/square');
const SegmentService = require('./segmentService');
const logger = require('../logger');

// Module-level refresh state so progress is visible to any request (status/progress endpoints use a new instance)
let globalRefreshInProgress = false;
let globalRefreshProgress = {
  total: 0,
  processed: 0,
  membersFound: 0,
  errors: 0,
  startTime: null
};

/**
 * Service for managing membership cache
 * Caches membership status to avoid expensive Square API calls
 */
class MembershipCache {
  constructor(db = null) {
    this.db = db || initDatabase();
    this.segmentService = new SegmentService(this.db);
    this.refreshInProgress = false;
    this.refreshProgress = {
      total: 0,
      processed: 0,
      membersFound: 0,
      errors: 0,
      startTime: null
    };
  }

  _getCacheRefreshAgeHours() {
    return getCacheRefreshAgeHours();
  }

  _getCacheTTLHours() {
    return getCacheTTLHours();
  }

  /**
   * Get membership status for a customer
   * Checks cache first, refreshes from Square if cache miss or stale
   * @param {string} customerId - Square customer ID
   * @param {boolean} forceRefresh - Force refresh from Square API
   * @returns {Promise<{hasMembership: boolean, segmentIds: string[], fromCache: boolean, lastVerifiedAt: string}>}
   */
  async getMembershipStatus(customerId, forceRefresh = false) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = this._getFromCache(customerId);
      if (cached) {
        if (this._isCacheValid(cached.last_verified_at)) {
          return {
            hasMembership: cached.has_membership === 1,
            segmentIds: cached.segment_ids || [],
            fromCache: true,
            lastVerifiedAt: cached.last_verified_at
          };
        }
      }
    }

    return this.refreshMembership(customerId);
  }

  /**
   * Refresh membership status from Square (customer's segment_ids vs configured segments) and update cache
   * @param {string} customerId - Square customer ID
   * @returns {Promise<{hasMembership: boolean, segmentIds: string[], fromCache: boolean, lastVerifiedAt: string}>}
   */
  async refreshMembership(customerId) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    try {
      const configuredIds = this.segmentService.getConfiguredSegmentIds();
      const customer = await squareService.getCustomer(customerId);
      const customerSegmentIds = customer.segment_ids || [];
      const segmentIds = customerSegmentIds.filter(id => configuredIds.includes(id));
      const hasMembership = segmentIds.length > 0;
      const addr = customer.address || (Array.isArray(customer.addresses) && customer.addresses[0]) || {};
      const details = {
        given_name: customer.given_name || '',
        family_name: customer.family_name || '',
        email_address: customer.email_address || '',
        phone_number: customer.phone_number || '',
        reference_id: customer.reference_id || '',
        address_line_1: (addr.address_line_1 || addr.address_line1 || '').trim(),
        locality: (addr.locality || '').trim(),
        postal_code: (addr.postal_code || '').trim()
      };
      this._updateCache(customerId, hasMembership, segmentIds, details);

      return {
        hasMembership,
        segmentIds,
        fromCache: false,
        lastVerifiedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error refreshing membership for ${customerId}:`, error);
      const cached = this._getFromCache(customerId);
      if (cached) {
        logger.warn(`Using stale cache for ${customerId} due to refresh error`);
        return {
          hasMembership: cached.has_membership === 1,
          segmentIds: cached.segment_ids || [],
          fromCache: true,
          lastVerifiedAt: cached.last_verified_at
        };
      }
      throw error;
    }
  }

  /**
   * Clear the entire membership cache. Use before a full refresh to ensure only
   * customers in configured segments are repopulated.
   * @returns {{ deleted: number }}
   */
  clearCache() {
    try {
      const result = this.db.prepare('DELETE FROM membership_cache').run();
      logger.info(`Membership cache cleared: ${result.changes} row(s) deleted`);
      return { deleted: result.changes };
    } catch (error) {
      logger.error('Error clearing membership cache:', error);
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
   * Check if error is a rate limit error
   * @private
   */
  _isRateLimitError(error) {
    if (!error) return false;
    const message = error.message || '';
    const status = error.status || error.statusCode || 0;
    
    // Check for rate limit status codes and messages
    return status === 429 || 
           message.includes('rate limit') || 
           message.includes('Rate limit') ||
           message.includes('RATE_LIMIT') ||
           message.includes('too many requests');
  }

  /**
   * Check if error is a permission error (403)
   * Permission errors should not be retried as they won't succeed
   * @private
   */
  _isPermissionError(error) {
    if (!error) return false;
    const message = error.message || '';
    const status = error.status || error.statusCode || 0;
    
    // Check for permission/authorization errors
    return status === 403 || 
           message.includes('insufficient permissions') ||
           message.includes('permission') ||
           message.includes('unauthorized') ||
           message.includes('forbidden');
  }

  /**
   * Retry with exponential backoff
   * Skips retries for permission errors (403) as they won't succeed
   * @private
   */
  async _retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        // Don't retry permission errors - they won't succeed
        if (this._isPermissionError(error)) {
          logger.warn(`Permission error detected, skipping retries: ${error.message}`);
          throw error;
        }
        
        // Retry rate limit errors
        if (this._isRateLimitError(error) && attempt < maxRetries - 1) {
          const delayMs = baseDelayMs * Math.pow(2, attempt);
          logger.warn(`Rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Refresh membership for multiple customers with concurrency control and rate limit handling
   * @param {string[]} customerIds - Array of customer IDs
   * @param {Object} options - Options for bulk refresh
   * @param {number} options.concurrency - Number of concurrent requests (default: from config)
   * @param {number} options.rateLimitMs - Delay between batches in ms (default: from config)
   * @param {number} options.requestDelayMs - Delay between individual requests in ms (default: from config)
   * @param {Function} options.onProgress - Progress callback (current, total) => {}
   * @returns {Promise<Array<{customerId: string, hasMembership: boolean, error?: string}>>}
   */
  async bulkRefresh(customerIds, options = {}) {
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return [];
    }

      const concurrency = options.concurrency || getBulkRefreshConcurrency();
      const rateLimitMs = options.rateLimitMs || getBulkRefreshRateLimitMs();
      const requestDelayMs = options.requestDelayMs || getBulkRefreshRequestDelayMs();
    const onProgress = options.onProgress || (() => {});

    const results = [];
    const total = customerIds.length;
    let processed = 0;
    let membersFound = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < customerIds.length; i += concurrency) {
      const batch = customerIds.slice(i, i + concurrency);
      
      // Process batch with delays between requests and retry logic
      const batchPromises = batch.map(async (customerId, index) => {
        // Add delay between requests within batch (staggered)
        if (index > 0 && requestDelayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, requestDelayMs * index));
        }

        return this._retryWithBackoff(async () => {
          try {
            const status = await this.refreshMembership(customerId);
            if (status.hasMembership) {
              membersFound++;
            }
            return {
              customerId,
              hasMembership: status.hasMembership
            };
          } catch (error) {
            // Handle different error types
            if (this._isPermissionError(error)) {
              logger.warn(`Permission error for customer ${customerId}: ${error.message}. Skipping this customer.`);
            } else if (this._isRateLimitError(error)) {
              logger.error(`Rate limit error refreshing membership for ${customerId} after retries:`, error.message);
            } else {
              logger.error(`Error refreshing membership for ${customerId} in bulk:`, error);
            }
            errors++;
            return {
              customerId,
              hasMembership: false,
              error: error.message,
              errorType: this._isPermissionError(error) ? 'permission' : 
                        this._isRateLimitError(error) ? 'rate_limit' : 'other'
            };
          }
        }, 3, 5000); // 3 retries, starting with 5 second delay
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      processed += batch.length;

      // Call progress callback
      onProgress(processed, total);

      // Rate limiting: wait before next batch (except for last batch)
      if (i + concurrency < customerIds.length && rateLimitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, rateLimitMs));
      }
    }

    logger.info(`Bulk refresh complete: ${processed}/${total} processed, ${membersFound} members found, ${errors} errors`);
    return results;
  }

  /**
   * Search membership cache by type and value (fuzzy or exact).
   * Used by the front-end search so results match the local cache (same as admin view).
   * @param {string} searchType - 'phone' | 'email' | 'lot' | 'name'
   * @param {string} searchValue - Value to search for
   * @param {boolean} fuzzy - If true, use LIKE '%value%'; otherwise exact match
   * @returns {Array<Object>} Cache rows with segment_ids parsed
   */
  searchCache(searchType, searchValue, fuzzy = true) {
    if (!searchValue || typeof searchValue !== 'string') {
      return [];
    }
    const value = searchValue.trim();
    if (!value) return [];

    try {
      const likePattern = fuzzy ? `%${value}%` : value;
      let stmt;
      const params = [likePattern];
      switch (searchType) {
        case 'phone':
          stmt = this.db.prepare(`
            SELECT customer_id, has_membership, segment_ids, last_verified_at,
                   given_name, family_name, email_address, phone_number, reference_id,
                   address_line_1, locality, postal_code
            FROM membership_cache
            WHERE phone_number LIKE ?
          `);
          break;
        case 'email':
          stmt = this.db.prepare(`
            SELECT customer_id, has_membership, segment_ids, last_verified_at,
                   given_name, family_name, email_address, phone_number, reference_id,
                   address_line_1, locality, postal_code
            FROM membership_cache
            WHERE email_address LIKE ?
          `);
          break;
        case 'lot':
          stmt = this.db.prepare(`
            SELECT customer_id, has_membership, segment_ids, last_verified_at,
                   given_name, family_name, email_address, phone_number, reference_id,
                   address_line_1, locality, postal_code
            FROM membership_cache
            WHERE reference_id LIKE ?
          `);
          break;
        case 'name':
          stmt = this.db.prepare(`
            SELECT customer_id, has_membership, segment_ids, last_verified_at,
                   given_name, family_name, email_address, phone_number, reference_id,
                   address_line_1, locality, postal_code
            FROM membership_cache
            WHERE given_name LIKE ? OR family_name LIKE ?
               OR (given_name || ' ' || family_name) LIKE ?
               OR (family_name || ' ' || given_name) LIKE ?
          `);
          params.push(likePattern, likePattern, likePattern);
          break;
        default:
          return [];
      }
      const rows = stmt.all(...params);
      return rows.map((row) => {
        const segmentIds = row.segment_ids ? JSON.parse(row.segment_ids) : [];
        return { ...row, segment_ids: segmentIds };
      });
    } catch (error) {
      logger.error('Error searching membership cache:', error);
      return [];
    }
  }

  /**
   * Get membership status from cache
   * @private
   */
  _getFromCache(customerId) {
    try {
      const result = this.db.prepare(`
        SELECT customer_id, has_membership, segment_ids, last_verified_at FROM membership_cache WHERE customer_id = ?
      `).get(customerId);
      if (!result) return null;
      const segmentIds = result.segment_ids ? JSON.parse(result.segment_ids) : [];
      return { ...result, segment_ids: segmentIds };
    } catch (error) {
      logger.error(`Error reading from cache for ${customerId}:`, error);
      return null;
    }
  }

  /**
   * Update cache with membership status (segment-based) and optional customer details
   * @private
   * @param {string} customerId
   * @param {boolean} hasMembership
   * @param {string[]} segmentIds - Square segment IDs the customer is in (from our configured segments)
   * @param {Object} [details] - Optional: given_name, family_name, email_address, phone_number, reference_id, address_line_1, locality, postal_code
   */
  _updateCache(customerId, hasMembership, segmentIds = [], details = {}) {
    try {
      const lastVerified = new Date().toISOString();
      const segmentIdsJson = JSON.stringify(Array.isArray(segmentIds) ? segmentIds : []);
      const givenName = details.given_name ?? '';
      const familyName = details.family_name ?? '';
      const email = details.email_address ?? '';
      const phone = details.phone_number ?? '';
      const refId = details.reference_id ?? '';
      const addr1 = details.address_line_1 ?? '';
      const locality = details.locality ?? '';
      const postal = details.postal_code ?? '';
      this.db.prepare(`
        INSERT INTO membership_cache (
          customer_id, has_membership, segment_ids, last_verified_at,
          given_name, family_name, email_address, phone_number, reference_id,
          address_line_1, locality, postal_code
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(customer_id) DO UPDATE SET
          has_membership = ?,
          segment_ids = ?,
          last_verified_at = ?,
          given_name = ?,
          family_name = ?,
          email_address = ?,
          phone_number = ?,
          reference_id = ?,
          address_line_1 = ?,
          locality = ?,
          postal_code = ?
      `).run(
        customerId,
        hasMembership ? 1 : 0,
        segmentIdsJson,
        lastVerified,
        givenName,
        familyName,
        email,
        phone,
        refId,
        addr1,
        locality,
        postal,
        hasMembership ? 1 : 0,
        segmentIdsJson,
        lastVerified,
        givenName,
        familyName,
        email,
        phone,
        refId,
        addr1,
        locality,
        postal
      );
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

    return hoursSinceVerification < this._getCacheTTLHours();
  }

  /**
   * Check if cache needs refresh and refresh if needed (on-boot check)
   * @returns {Promise<boolean>} True if refresh was triggered, false otherwise
   */
  async checkAndRefreshIfNeeded() {
    try {
      const stats = this.getCacheStats();
      
      // Check if cache is empty or older than refresh age
      const cacheAgeHours = stats.cacheAgeHours;
      const refreshAgeHours = this._getCacheRefreshAgeHours();
      const needsRefresh = stats.totalCustomers === 0 || cacheAgeHours >= refreshAgeHours;

      if (needsRefresh) {
        logger.info(`Cache refresh needed: ${stats.totalCustomers} customers, ${cacheAgeHours.toFixed(1)} hours old`);
        
        // Refresh all customers
        await this.refreshAllCustomers();
        return true;
      } else {
        logger.info(`Cache is fresh: ${stats.totalCustomers} customers, ${cacheAgeHours.toFixed(1)} hours old`);
        return false;
      }
    } catch (error) {
      logger.error('Error checking cache refresh status:', error);
      return false;
    }
  }

  /**
   * Refresh membership cache from Square: fetch only customers in configured segments,
   * clear the cache, and repopulate with those members. Cache count = member count.
   * @param {Function} onProgress - Optional progress callback (current, total) => {}
   * @returns {Promise<{total: number, processed: number, membersFound: number, errors: number}>}
   */
  async refreshAllCustomers(onProgress = null) {
    if (this.refreshInProgress) {
      logger.warn('Cache refresh already in progress');
      return this.refreshProgress;
    }

    this.refreshInProgress = true;
    this.refreshProgress = {
      total: 0,
      processed: 0,
      membersFound: 0,
      errors: 0,
      startTime: new Date().toISOString()
    };
    globalRefreshInProgress = true;
    globalRefreshProgress = { ...this.refreshProgress };

    try {
      const segments = this.segmentService.getSegments();
      if (segments.length === 0) {
        throw new Error('No customer segments configured. Add segments in Admin → Segments.');
      }

      // 1. For each configured segment, get customer IDs in that segment; build customerId -> [segment_ids]
      const customerToSegments = new Map();
      for (const seg of segments) {
        logger.info(`Fetching customers in segment "${seg.display_name}" (${seg.segment_id})...`);
        const memberIds = await squareService.searchCustomersBySegment(seg.segment_id);
        for (const customerId of memberIds) {
          const existing = customerToSegments.get(customerId) || [];
          if (!existing.includes(seg.segment_id)) {
            existing.push(seg.segment_id);
          }
          customerToSegments.set(customerId, existing);
        }
      }
      const memberIds = Array.from(customerToSegments.keys());
      this.refreshProgress.membersFound = memberIds.length;
      this.refreshProgress.total = memberIds.length;
      globalRefreshProgress = { ...this.refreshProgress };

      if (onProgress) {
        onProgress(0, memberIds.length);
      }

      // 2. Clear cache so it reflects only approved segments (true up with segment membership)
      logger.info('Clearing membership cache...');
      this.db.prepare('DELETE FROM membership_cache').run();

      // 3. Fetch each member's details from Square and insert into cache (with rate limiting)
      const concurrency = getBulkRefreshConcurrency();
      const requestDelayMs = getBulkRefreshRequestDelayMs();
      const rateLimitMs = getBulkRefreshRateLimitMs();
      let processed = 0;
      let errors = 0;

      const extractDetails = (customer) => {
        // Square may return address (object) or addresses (array); use first available
        const addr = customer.address || (Array.isArray(customer.addresses) && customer.addresses[0]) || {};
        return {
          given_name: customer.given_name || '',
          family_name: customer.family_name || '',
          email_address: customer.email_address || '',
          phone_number: customer.phone_number || '',
          reference_id: customer.reference_id || '',
          address_line_1: (addr.address_line_1 || addr.address_line1 || '').trim(),
          locality: (addr.locality || '').trim(),
          postal_code: (addr.postal_code || '').trim()
        };
      };

      for (let i = 0; i < memberIds.length; i += concurrency) {
        const batch = memberIds.slice(i, i + concurrency);
        const batchPromises = batch.map(async (customerId, idx) => {
          if (idx > 0 && requestDelayMs > 0) {
            await new Promise(r => setTimeout(r, requestDelayMs * idx));
          }
          try {
            const customer = await squareService.getCustomer(customerId);
            const details = extractDetails(customer);
            const segmentIds = customerToSegments.get(customerId) || [];
            this._updateCache(customerId, true, segmentIds, details);
            return null;
          } catch (err) {
            logger.warn(`Failed to fetch details for ${customerId}: ${err.message}`);
            return err;
          }
        });
        const results = await Promise.all(batchPromises);
        errors += results.filter(Boolean).length;
        processed += batch.length;
        this.refreshProgress.processed = processed;
        this.refreshProgress.errors = errors;
        globalRefreshProgress = { ...this.refreshProgress };
        if (onProgress) {
          onProgress(processed, memberIds.length);
        }
        if (i + concurrency < memberIds.length && rateLimitMs > 0) {
          await new Promise(r => setTimeout(r, rateLimitMs));
        }
      }

      logger.info(`Cache refresh complete: ${processed} members in cache (from ${segments.length} segment(s))`);
      return this.refreshProgress;
    } catch (error) {
      logger.error('Error refreshing all customers:', error);
      throw error;
    } finally {
      this.refreshInProgress = false;
      globalRefreshInProgress = false;
    }
  }

  /**
   * Get cache statistics for UI display
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    try {
      // Get total customers
      const totalResult = this.db.prepare(`
        SELECT COUNT(*) as count FROM membership_cache
      `).get();
      const totalCustomers = totalResult?.count || 0;

      // Get last refresh time
      const lastRefreshResult = this.db.prepare(`
        SELECT MAX(last_verified_at) as last_refresh FROM membership_cache
      `).get();
      const lastRefreshTime = lastRefreshResult?.last_refresh || null;

      // Calculate cache age
      let cacheAgeHours = 0;
      let cacheStatus = 'Empty';
      
      if (lastRefreshTime) {
        const lastRefresh = new Date(lastRefreshTime);
        const now = new Date();
        cacheAgeHours = (now - lastRefresh) / (1000 * 60 * 60);
        
        const refreshAgeHours = this._getCacheRefreshAgeHours();
        if (cacheAgeHours < refreshAgeHours) {
          cacheStatus = 'Fresh';
        } else {
          cacheStatus = 'Stale';
        }
      } else if (totalCustomers === 0) {
        cacheStatus = 'Empty';
      }

      return {
        totalCustomers,
        lastRefreshTime,
        cacheAgeHours: Math.round(cacheAgeHours * 10) / 10, // Round to 1 decimal
        cacheStatus,
        refreshInProgress: globalRefreshInProgress,
        refreshProgress: globalRefreshInProgress ? { ...globalRefreshProgress } : null
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        totalCustomers: 0,
        lastRefreshTime: null,
        cacheAgeHours: 0,
        cacheStatus: 'Error',
        refreshInProgress: false,
        refreshProgress: null
      };
    }
  }

  /**
   * Get last refresh time
   * @returns {string|null} ISO timestamp of last refresh or null
   */
  getLastRefreshTime() {
    try {
      const result = this.db.prepare(`
        SELECT MAX(last_verified_at) as last_refresh FROM membership_cache
      `).get();
      return result?.last_refresh || null;
    } catch (error) {
      logger.error('Error getting last refresh time:', error);
      return null;
    }
  }

  /**
   * Get current refresh progress (if refresh in progress)
   * Reads from module-level state so any instance sees the running refresh.
   * @returns {Object|null} Progress object or null if not in progress
   */
  getRefreshProgress() {
    if (globalRefreshInProgress) {
      return {
        inProgress: true,
        ...globalRefreshProgress
      };
    }
    return null;
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

/** Set global "refresh in progress" flag so status/progress endpoints see it immediately (before async work starts) */
function setGlobalRefreshInProgress(value) {
  globalRefreshInProgress = value;
}

module.exports = MembershipCache;
module.exports.setGlobalRefreshInProgress = setGlobalRefreshInProgress;

