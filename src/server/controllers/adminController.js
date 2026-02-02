const { initDatabase } = require('../db/database');
const logger = require('../logger');
const squareService = require('../services/squareService');
const membershipCacheModule = require('../services/membershipCache');
const MembershipCache = membershipCacheModule;
const ConfigService = require('../services/configService');
const SegmentService = require('../services/segmentService');

/**
 * Controller handling admin-related operations
 * @class AdminController
 */
class AdminController {
  /**
   * Enrich database entries with customer details from Square
   * @private
   */
  async _enrichWithCustomerDetails(entries, customerIdField = 'customer_id') {
    // Get unique customer IDs (exclude DAYPASS - anonymous day-pass check-ins)
    const customerIds = [...new Set(entries.map(entry => entry[customerIdField]).filter(id => id && id !== 'DAYPASS'))];
    
    // Rate limiting configuration for enrichment
    const ENRICHMENT_DELAY_MS = 500; // 500ms delay between requests
    
    // Fetch customer details (with error handling for missing customers)
    const customerMap = new Map();
    
    // Process customers sequentially with delays to avoid rate limits
    for (let i = 0; i < customerIds.length; i++) {
      const customerId = customerIds[i];
      
      // Add delay between requests (except for first one)
      if (i > 0 && ENRICHMENT_DELAY_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, ENRICHMENT_DELAY_MS));
      }
      
      try {
        const customer = await squareService.getCustomer(customerId);
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
        customerMap.set(customerId, details);
      } catch (error) {
        // Customer not found or error - leave fields empty
        logger.debug(`Could not fetch customer ${customerId}: ${error.message}`);
        customerMap.set(customerId, {
          given_name: '',
          family_name: '',
          email_address: '',
          phone_number: '',
          reference_id: '',
          address_line_1: '',
          locality: '',
          postal_code: ''
        });
      }
    }
    
    // Enrich entries with customer details (day-pass rows get display "Day pass" without calling Square)
    return entries.map(entry => {
      const customerId = entry[customerIdField];
      if (customerId === 'DAYPASS' || entry.checkin_type === 'daypass') {
        return {
          ...entry,
          given_name: 'Day pass',
          family_name: '',
          email_address: '',
          phone_number: '',
          reference_id: '',
          address_line_1: '',
          locality: '',
          postal_code: ''
        };
      }
      const customerDetails = customerMap.get(customerId) || {
        given_name: '',
        family_name: '',
        email_address: '',
        phone_number: '',
        reference_id: '',
        address_line_1: '',
        locality: '',
        postal_code: ''
      };
      return {
        ...entry,
        ...customerDetails
      };
    });
  }

  /**
   * Get all database contents
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getDatabaseContents(req, res, next) {
    try {
      const db = initDatabase();
      const enrich = req.query.enrich === 'true';

      // Query membership_cache (segment-based; includes stored enrichment: names, address, etc.)
      const membershipCache = db.prepare(`
        SELECT customer_id, has_membership, segment_ids, last_verified_at,
          given_name, family_name, email_address, phone_number, reference_id,
          address_line_1, locality, postal_code
        FROM membership_cache
        ORDER BY last_verified_at DESC
      `).all();

      // Query customer_segments
      const customerSegments = db.prepare(`
        SELECT id, segment_id, display_name, sort_order FROM customer_segments ORDER BY sort_order ASC, display_name ASC
      `).all();
      
      const checkinQueue = db.prepare(`
        SELECT id, customer_id, order_id, guest_count, status, created_at, synced_at
        FROM checkin_queue
        ORDER BY created_at DESC
      `).all();
      
      const checkinLog = db.prepare(`
        SELECT id, customer_id, order_id, guest_count, timestamp, synced_to_square, checkin_type
        FROM checkin_log
        ORDER BY timestamp DESC
        LIMIT 1000
      `).all();
      
      db.close();

      // Membership cache already has names/address from refresh; only enrich queue and log when ?enrich=true
      let finalMembershipCache = membershipCache;
      let finalCheckinQueue = checkinQueue;
      let finalCheckinLog = checkinLog;
      if (enrich) {
        finalCheckinQueue = await this._enrichWithCustomerDetails(checkinQueue);
        finalCheckinLog = await this._enrichWithCustomerDetails(checkinLog);
      }
      // Ensure membership cache rows have display fields (coerce null to '' so UI always gets strings)
      const displayFields = ['given_name', 'family_name', 'email_address', 'phone_number', 'reference_id', 'address_line_1', 'locality', 'postal_code'];
      finalMembershipCache = finalMembershipCache.map(row => {
        const out = { ...row };
        for (const key of displayFields) {
          out[key] = (row[key] != null && String(row[key]).trim() !== '') ? String(row[key]) : '';
        }
        return out;
      });
      const emptyDetails = {
        given_name: '',
        family_name: '',
        email_address: '',
        phone_number: '',
        reference_id: '',
        address_line_1: '',
        locality: '',
        postal_code: ''
      };
      if (!enrich) {
        finalCheckinQueue = checkinQueue.map(row => ({ ...row, ...emptyDetails }));
        finalCheckinLog = checkinLog.map(row => {
          const out = { ...row, ...emptyDetails };
          if (row.checkin_type === 'daypass' || row.customer_id === 'DAYPASS') {
            out.given_name = 'Day pass';
            out.family_name = '';
          }
          return out;
        });
      }
      
      const result = {
        membershipCache: finalMembershipCache,
        customerSegments,
        checkinQueue: finalCheckinQueue,
        checkinLog: finalCheckinLog
      };
      
      res.json(result);
    } catch (error) {
      logger.error(`Error getting database contents: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get cache status and statistics
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getCacheStatus(req, res, next) {
    try {
      const membershipCache = new MembershipCache();
      const stats = membershipCache.getCacheStats();
      res.json(stats);
    } catch (error) {
      logger.error(`Error getting cache status: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get cache refresh progress (if refresh in progress)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getCacheProgress(req, res, next) {
    try {
      const membershipCache = new MembershipCache();
      const progress = membershipCache.getRefreshProgress();
      
      if (progress) {
        res.json(progress);
      } else {
        res.json({ inProgress: false });
      }
    } catch (error) {
      logger.error(`Error getting cache progress: ${error.message}`);
      next(error);
    }
  }

  /**
   * Trigger cache refresh for all customers
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async refreshCache(req, res, next) {
    try {
      const membershipCache = new MembershipCache();

      // Check if refresh is already in progress (read global state)
      if (membershipCache.getRefreshProgress()) {
        return res.status(409).json({
          error: 'Cache refresh already in progress',
          progress: membershipCache.getRefreshProgress()
        });
      }

      // Set flag immediately so status/progress endpoints see "in progress" before async work starts
      if (typeof membershipCacheModule.setGlobalRefreshInProgress === 'function') {
        membershipCacheModule.setGlobalRefreshInProgress(true);
      }

      // Start refresh in background (don't await)
      membershipCache.refreshAllCustomers().catch(error => {
        const msg = error?.message ?? String(error);
        logger.error(`Error during background cache refresh: ${msg}`);
        if (error?.stack) logger.error(error.stack);
      });

      // Return immediately with initial progress
      res.json({
        success: true,
        message: 'Cache refresh started',
        progress: membershipCache.getRefreshProgress()
      });
    } catch (error) {
      logger.error(`Error starting cache refresh: ${error.message}`);
      next(error);
    }
  }

  /**
   * Clear the membership cache (delete all rows). Use before refresh to repopulate
   * only from configured segments.
   */
  async clearCache(req, res, next) {
    try {
      const membershipCache = new MembershipCache();
      const { deleted } = membershipCache.clearCache();
      membershipCache.close();
      res.json({
        success: true,
        message: `Membership cache cleared (${deleted} row(s) removed). Use Refresh Cache to repopulate from segments.`,
        deleted
      });
    } catch (error) {
      logger.error(`Error clearing cache: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get customer segments from Square API (for admin UI to pick which to add)
   */
  async getSquareSegments(req, res, next) {
    try {
      const segments = await squareService.listCustomerSegments();
      res.json({ segments });
    } catch (error) {
      logger.error(`Error listing Square segments: ${error.message}`);
      res.status(error.message?.includes('401') || error.message?.includes('UNAUTHORIZED') ? 401 : 500)
        .json({ error: error.message || 'Failed to list Square segments' });
    }
  }

  /**
   * Get configured customer segments (Square segment ID + display name)
   */
  async getSegments(req, res, next) {
    try {
      const segmentService = new SegmentService();
      const segments = segmentService.getSegments();
      res.json(segments);
    } catch (error) {
      logger.error(`Error getting segments: ${error.message}`);
      next(error);
    }
  }

  /**
   * Add a customer segment
   */
  async addSegment(req, res, next) {
    try {
      const { segment_id: segmentId, display_name: displayName, sort_order: sortOrder } = req.body;
      if (!segmentId || !displayName) {
        return res.status(400).json({ error: 'segment_id and display_name are required' });
      }
      const segmentService = new SegmentService();
      const segment = segmentService.addSegment(segmentId, displayName, sortOrder);
      res.status(201).json(segment);
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      logger.error(`Error adding segment: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update a customer segment
   */
  async updateSegment(req, res, next) {
    try {
      const { segmentId } = req.params;
      const { display_name: displayName, sort_order: sortOrder } = req.body;
      if (!segmentId) {
        return res.status(400).json({ error: 'segmentId is required' });
      }
      const segmentService = new SegmentService();
      const segment = segmentService.updateSegment(segmentId, { display_name: displayName, sort_order: sortOrder });
      if (!segment) {
        return res.status(404).json({ error: 'Segment not found' });
      }
      res.json(segment);
    } catch (error) {
      logger.error(`Error updating segment: ${error.message}`);
      next(error);
    }
  }

  /**
   * Delete a customer segment
   */
  async deleteSegment(req, res, next) {
    try {
      const { segmentId } = req.params;
      if (!segmentId) {
        return res.status(400).json({ error: 'segmentId is required' });
      }
      const segmentService = new SegmentService();
      segmentService.deleteSegment(segmentId);
      res.status(204).send();
    } catch (error) {
      if (error.message && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      logger.error(`Error deleting segment: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get application configuration
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getConfig(req, res, next) {
    try {
      const configService = new ConfigService();
      const config = configService.getAll();
      res.json(config);
    } catch (error) {
      logger.error(`Error getting config: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update application configuration
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async updateConfig(req, res, next) {
    try {
      const { key, value } = req.body;
      
      if (!key) {
        return res.status(400).json({ error: 'Config key is required' });
      }

      // Validate editable keys
      const editableKeys = [
        'MEMBERSHIP_SEGMENT_ID',
        'MEMBERSHIP_CATALOG_ITEM_ID',
        'MEMBERSHIP_VARIANT_ID',
        'CHECKIN_CATALOG_ITEM_ID',
        'CHECKIN_VARIANT_ID',
        'BULK_REFRESH_CONCURRENCY',
        'BULK_REFRESH_RATE_LIMIT_MS',
        'BULK_REFRESH_REQUEST_DELAY_MS',
        'CACHE_REFRESH_AGE_HOURS',
        'SQUARE_API_URL',
        'SQUARE_API_VERSION'
      ];

      if (!editableKeys.includes(key)) {
        return res.status(400).json({ error: `Config key '${key}' is not editable` });
      }

      // Validate numeric values
      const numericKeys = [
        'BULK_REFRESH_CONCURRENCY',
        'BULK_REFRESH_RATE_LIMIT_MS',
        'BULK_REFRESH_REQUEST_DELAY_MS',
        'CACHE_REFRESH_AGE_HOURS'
      ];

      if (numericKeys.includes(key)) {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
          return res.status(400).json({ error: `Config value for '${key}' must be a positive number` });
        }
      }

      const configService = new ConfigService();
      configService.set(key, String(value));

      logger.info(`Config updated: ${key} = ${key.includes('TOKEN') ? '***' : value}`);
      
      res.json({
        success: true,
        key,
        value: key.includes('TOKEN') ? '***' : value,
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      logger.error(`Error updating config: ${error.message}`);
      next(error);
    }
  }
}

module.exports = new AdminController();

