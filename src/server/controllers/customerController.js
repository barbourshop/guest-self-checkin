const squareService = require('../services/squareService');
const customerService = require('../services/customerService');
const CheckinVerification = require('../services/checkinVerification');
const OfflineQueue = require('../services/offlineQueue');
const { initDatabase } = require('../db/database');
const logger = require('../logger');
const { logCheckInCSV } = require('../utils/checkinMetricsLogger');

/**
 * Controller handling customer-related operations
 * @class CustomerController
 */
class CustomerController {
  constructor() {
    try {
      this.offlineQueue = new OfflineQueue();
      this.checkinVerification = new CheckinVerification();
    } catch (error) {
      logger.error('Error initializing controller services:', error);
      // Services will be initialized lazily if needed
      this.offlineQueue = null;
      this.checkinVerification = null;
    }
  }

  _getOfflineQueue() {
    if (!this.offlineQueue) {
      this.offlineQueue = new OfflineQueue();
    }
    return this.offlineQueue;
  }

  _getCheckinVerification() {
    if (!this.checkinVerification) {
      this.checkinVerification = new CheckinVerification();
    }
    return this.checkinVerification;
  }
  /**
   * Search for customers by phone number
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async searchByPhone(req, res, next) {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      
      // Use customerService to search and enrich customer data
      const customers = await customerService.searchCustomers('phone', phone);
      
      res.json(customers);
    } catch (error) {
      logger.error(`Error searching by phone: ${error.message}`);
      next(error);
    }
  }

  /**
   * Search for customers by email
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async searchByEmail(req, res, next) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Use customerService to search and enrich customer data
      const customers = await customerService.searchCustomers('email', email);
      
      res.json(customers);
    } catch (error) {
      logger.error(`Error searching by email: ${error.message}`);
      next(error);
    }
  }

  /**
   * Search for customers by lot number
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async searchByLot(req, res, next) {
    try {
      const { lot } = req.body;
      
      if (!lot) {
        return res.status(400).json({ error: 'Lot number is required' });
      }
      
      // Use customerService to search and enrich customer data
      const customers = await customerService.searchCustomers('lot', lot);
      
      res.json(customers);
    } catch (error) {
      logger.error(`Error searching by lot: ${error.message}`);
      next(error);
    }
  }

  /**
   * Search for customers by name
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async searchByName(req, res, next) {
    try {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      
      const customers = await customerService.searchCustomers('name', name);
      
      res.json(customers);
    } catch (error) {
      logger.error(`Error searching by name: ${error.message}`);
      next(error);
    }
  }

  /**
   * Search for customers by address
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async searchByAddress(req, res, next) {
    try {
      const { address } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }
      
      const customers = await customerService.searchCustomers('address', address);
      
      res.json(customers);
    } catch (error) {
      logger.error(`Error searching by address: ${error.message}`);
      next(error);
    }
  }

  /**
   * Search endpoint - accepts SearchRequestPayload format
   * Searches the local membership cache (same data as admin view), not Square API.
   * POST /customers/search
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async search(req, res, next) {
    try {
      const { query, includeMembershipMeta = false } = req.body;

      if (!query || !query.type || !query.value) {
        return res.status(400).json({ error: 'Invalid search query. Expected { query: { type, value, fuzzy? }, includeMembershipMeta? }' });
      }

      const { type, value, fuzzy = true } = query; // Default to fuzzy=true for better UX

      // Validate search type
      if (!['phone', 'email', 'lot', 'name', 'customer_id'].includes(type)) {
        return res.status(400).json({ error: `Invalid search type: ${type}. Must be 'phone', 'email', 'lot', 'name', or 'customer_id'` });
      }

      // Search local membership cache (same source as admin view); customer_id uses exact match
      const MembershipCache = require('../services/membershipCache');
      const membershipCache = new MembershipCache();
      const cacheRows = membershipCache.searchCache(type, value, type === 'customer_id' ? false : fuzzy);

      const SegmentService = require('../services/segmentService');
      const segmentService = new SegmentService();
      const { transformCacheRowToSearchResult } = require('../utils/squareDataTransformers');

      const transformedResults = cacheRows.map((row) =>
        transformCacheRowToSearchResult(row, segmentService, includeMembershipMeta)
      );

      res.json({ results: transformedResults });
    } catch (error) {
      logger.error(`Error in search: ${error.message}`);
      next(error);
    }
  }

  /**
   * Unified search endpoint - auto-detects search type
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async unifiedSearch(req, res, next) {
    try {
      const { query, isQRMode = false } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const result = await customerService.unifiedSearch(query, isQRMode);

      res.json(result);
    } catch (error) {
      logger.error(`Error in unified search: ${error.message}`);
      next(error);
    }
  }

  /**
   * Validate QR code (order ID)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async validateQRCode(req, res, next) {
    try {
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ 
          valid: false, 
          reason: 'Order ID is required' 
        });
      }
      
      const verification = await this._getCheckinVerification().verifyCheckinOrder(orderId, {
        checkMembership: true
      });
      
      if (!verification.valid) {
        // Return standardized error message
        return res.json({
          valid: false,
          reason: 'An issue with check-in, please see the manager on duty'
        });
      }
      
      res.json({
        valid: true,
        order: verification.order,
        customerId: verification.customerId,
        hasMembership: verification.hasMembership
      });
    } catch (error) {
      logger.error(`Error validating QR code: ${error.message}`);
      
      // Check if it's a network error - queue the check-in
      if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('timeout')) {
        try {
          // Try to queue if we have order data
          const { orderId } = req.body;
          if (orderId) {
            // We don't have customerId from failed verification, so queue with minimal data
            await this._getOfflineQueue().queueCheckin({
              customerId: 'unknown',
              orderId: orderId,
              guestCount: 0 // Will be updated when synced
            });
          }
        } catch (queueError) {
          logger.error('Error queueing check-in:', queueError);
        }
      }
      
      res.json({
        valid: false,
        reason: 'An issue with check-in, please see the manager on duty'
      });
    }
  }

  /**
   * List all customers
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async listCustomers(req, res, next) {
    try {
      const { limit, cursor } = req.query;
      
      const result = await squareService.listCustomers(
        limit ? parseInt(limit, 10) : 5,
        cursor
      );
      
      res.json(result);
    } catch (error) {
      logger.error(`Error listing customers: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get detailed customer information (admin only)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getCustomerDetails(req, res, next) {
    try {
      const { customerId } = req.params;
      const customer = await customerService.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json(customer);
    } catch (error) {
      logger.error(`Error getting customer details: ${error.message}`);
      next(error);
    }
  }


  /**
   * Log a customer check-in
   * Supports both manual check-in (with customerId) and QR code check-in (with orderId)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async logCheckIn(req, res, next) {
    try {
      const { customerId, orderId, guestCount, firstName, lastName, lotNumber } = req.body;

      // Check-in is by customerId only; membership is verified from cache (segment-based). Orders are not used.
      // Validate required fields
      if (!customerId || guestCount === undefined || !firstName || !lastName) {
        return res.status(400).json({ 
          success: false,
          error: 'Missing required fields: customerId, guestCount, firstName, lastName' 
        });
      }
      
      // Coerce guest count to integer (frontend may send number or string)
      const guestCountNum = typeof guestCount === 'number' ? Math.floor(guestCount) : parseInt(guestCount, 10);
      if (Number.isNaN(guestCountNum) || guestCountNum < 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Guest count must be a positive number' 
        });
      }

      // Verify membership from cache (segment-based)
      const MembershipCache = require('../services/membershipCache');
      const membershipCache = new MembershipCache();
      const membershipStatus = await membershipCache.getMembershipStatus(customerId);
      if (!membershipStatus.hasMembership) {
        return res.status(400).json({
          success: false,
          error: 'Customer does not have active membership'
        });
      }
      
      // Log the check-in as a CSV row
      logCheckInCSV({ customerId, guestCount, firstName, lastName, lotNumber });
      
      // Also log to database (checkin_type = 'member' for search/scan check-ins)
      try {
        const db = initDatabase();
        const result = db.prepare(`
          INSERT INTO checkin_log 
          (customer_id, order_id, guest_count, timestamp, synced_to_square, checkin_type)
          VALUES (?, ?, ?, ?, ?, 'member')
        `).run(
          customerId,
          orderId || null, // Optional; orders are not verified
          guestCountNum,
          new Date().toISOString(),
          0
        );
        db.close();
        logger.info(`Check-in logged: customerId=${customerId}, guestCount=${guestCountNum}, insertId=${result.lastInsertRowid}`);
      } catch (dbError) {
        const errMsg = dbError && dbError.message ? dbError.message : String(dbError);
        const errCode = dbError && dbError.code ? dbError.code : undefined;
        const logDetail = errCode ? `${errMsg} (code: ${errCode})` : errMsg;
        if (dbError && dbError.stack) {
          logger.error(`Error logging to database: ${logDetail}\n${dbError.stack}`);
        } else {
          logger.error(`Error logging to database: ${logDetail}`);
        }
        // Return error response with detail in non-production so user can diagnose
        const errorDetail = process.env.NODE_ENV !== 'production' ? (errMsg || logDetail) : 'Failed to log check-in to database';
        return res.status(500).json({ 
          success: false,
          error: errorDetail 
        });
      }
      
      res.json({ 
        success: true, 
        checkIn: { 
          customerId, 
          orderId: orderId || null,
          guestCount: guestCountNum, 
          firstName, 
          lastName, 
          lotNumber 
        } 
      });
    } catch (error) {
      logger.error(`Error logging check-in: ${error.message}`);
      
      // If network error, try to queue the check-in
      if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('timeout')) {
        try {
          const { customerId, orderId, guestCount } = req.body;
          if (customerId || orderId) {
            await this._getOfflineQueue().queueCheckin({
              customerId: customerId || 'unknown',
              orderId: orderId || 'manual',
              guestCount: guestCount || 0
            });
            
            // Return success even though we queued it
            return res.json({ 
              success: true, 
              queued: true,
              message: 'Check-in queued - will sync when connection restored'
            });
          }
        } catch (queueError) {
          logger.error('Error queueing check-in:', queueError);
        }
      }
      
      next(error);
    }
  }

  /**
   * Log an anonymous day-pass check-in (no customer search).
   * Used when front desk sells a day pass on the spot.
   * POST /api/customers/check-in/daypass
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async logDayPassCheckIn(req, res, next) {
    try {
      const { guestCount } = req.body;

      const guestCountNum = typeof guestCount === 'number' ? Math.floor(guestCount) : parseInt(guestCount, 10);
      if (Number.isNaN(guestCountNum) || guestCountNum < 1) {
        return res.status(400).json({
          success: false,
          error: 'Guest count must be at least 1'
        });
      }

      const timestamp = new Date().toISOString();
      logCheckInCSV({
        customerId: 'DAYPASS',
        guestCount: guestCountNum,
        firstName: 'Day pass',
        lastName: '',
        lotNumber: ''
      });

      try {
        const db = initDatabase();
        const result = db.prepare(`
          INSERT INTO checkin_log 
          (customer_id, order_id, guest_count, timestamp, synced_to_square, checkin_type)
          VALUES ('DAYPASS', NULL, ?, ?, 0, 'daypass')
        `).run(guestCountNum, timestamp);
        db.close();
        logger.info(`Day-pass check-in logged: guestCount=${guestCountNum}, insertId=${result.lastInsertRowid}`);
      } catch (dbError) {
        const errMsg = dbError && dbError.message ? dbError.message : String(dbError);
        logger.error(`Error logging day-pass check-in to database: ${errMsg}`);
        return res.status(500).json({
          success: false,
          error: 'Failed to log day-pass check-in'
        });
      }

      res.json({
        success: true,
        checkIn: {
          customerId: 'DAYPASS',
          orderId: null,
          guestCount: guestCountNum,
          checkinType: 'daypass'
        }
      });
    } catch (error) {
      logger.error(`Error logging day-pass check-in: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get all customer data for local search (id, names, email, phone, lot, segment_ids)
   * @param {Request} req
   * @param {Response} res
   */
  async getCustomerNames(req, res, next) {
    try {
      const customers = await squareService.getCustomerNames();
      res.json(customers);
    } catch (error) {
      logger.error(`Error fetching customer names: ${error.message}`);
      next(error);
    }
  }

}

module.exports = new CustomerController();