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
   * Unified search endpoint - auto-detects search type
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async unifiedSearch(req, res, next) {
    const fs = require('fs');
    const logPath = '/Users/mbarbo000/Documents/Projects/guest-self-checkin/.cursor/debug.log';
    
    try {
      const { query, isQRMode = false } = req.body;
      
      // #region agent log
      fs.appendFileSync(logPath, JSON.stringify({location:'customerController.js:unifiedSearch:entry',message:'Controller received request',data:{query,isQRMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}) + '\n');
      // #endregion
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const result = await customerService.unifiedSearch(query, isQRMode);
      
      // #region agent log
      fs.appendFileSync(logPath, JSON.stringify({location:'customerController.js:unifiedSearch:before-response',message:'About to send response',data:{type:result.type,resultsCount:result.results?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'}) + '\n');
      // #endregion
      
      res.json(result);
    } catch (error) {
      // #region agent log
      fs.appendFileSync(logPath, JSON.stringify({location:'customerController.js:unifiedSearch:error',message:'Controller error',data:{error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}) + '\n');
      // #endregion
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
    const fs = require('fs');
    const logPath = '/Users/mbarbo000/Documents/Projects/guest-self-checkin/.cursor/debug.log';
    
    try {
      const { customerId, orderId, guestCount, firstName, lastName, lotNumber } = req.body;
      
      // #region agent log
      fs.appendFileSync(logPath, JSON.stringify({location:'customerController.js:logCheckIn:entry',message:'Check-in request received',data:{customerId,orderId,guestCount,firstName,lastName,lotNumber},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'}) + '\n');
      // #endregion
      
      // If orderId provided, verify it first
      if (orderId) {
        const verification = await this._getCheckinVerification().verifyCheckinOrder(orderId, {
          checkMembership: true
        });
        
        if (!verification.valid) {
          return res.status(400).json({
            success: false,
            error: 'An issue with check-in, please see the manager on duty'
          });
        }
        
        // Use customer ID from verified order
        const verifiedCustomerId = verification.customerId || customerId;
        const verifiedGuestCount = guestCount || 1; // Default to 1 if not provided
        
        // Log to CSV (maintain existing behavior)
        if (firstName && lastName) {
          logCheckInCSV({ 
            customerId: verifiedCustomerId, 
            guestCount: verifiedGuestCount, 
            firstName, 
            lastName, 
            lotNumber 
          });
        }
        
        // Also log to database for queue/sync
        try {
          const db = initDatabase();
          // #region agent log
          fs.appendFileSync(logPath, JSON.stringify({location:'customerController.js:logCheckIn:before-db-insert-qr',message:'About to insert QR check-in to database',data:{verifiedCustomerId,orderId,verifiedGuestCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'}) + '\n');
          // #endregion
          db.prepare(`
            INSERT INTO checkin_log 
            (customer_id, order_id, guest_count, timestamp, synced_to_square)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            verifiedCustomerId,
            orderId,
            verifiedGuestCount,
            new Date().toISOString(),
            1 // Assume synced since we verified with Square
          );
          db.close();
          // #region agent log
          fs.appendFileSync(logPath, JSON.stringify({location:'customerController.js:logCheckIn:after-db-insert-qr',message:'QR check-in logged to database',data:{verifiedCustomerId,orderId,verifiedGuestCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'}) + '\n');
          // #endregion
        } catch (dbError) {
          logger.error('Error logging to database:', dbError);
          // Continue even if DB logging fails
        }
        
        return res.json({ 
          success: true, 
          checkIn: { 
            customerId: verifiedCustomerId, 
            orderId,
            guestCount: verifiedGuestCount, 
            firstName, 
            lastName, 
            lotNumber 
          } 
        });
      }
      
      // Legacy manual check-in (customerId provided directly)
      // Validate required fields
      if (!customerId || guestCount === undefined || !firstName || !lastName) {
        return res.status(400).json({ 
          error: 'Missing required fields: customerId, guestCount, firstName, lastName' 
        });
      }
      
      // Validate guest count is a positive number
      if (typeof guestCount !== 'number' || guestCount < 0) {
        return res.status(400).json({ error: 'Guest count must be a positive number' });
      }
      
      // Log the check-in as a CSV row
      logCheckInCSV({ customerId, guestCount, firstName, lastName, lotNumber });
      
      // Also log to database
      try {
        const db = initDatabase();
        // #region agent log
        fs.appendFileSync(logPath, JSON.stringify({location:'customerController.js:logCheckIn:before-db-insert-manual',message:'About to insert manual check-in to database',data:{customerId,guestCount,firstName,lastName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'}) + '\n');
        // #endregion
        db.prepare(`
          INSERT INTO checkin_log 
          (customer_id, order_id, guest_count, timestamp, synced_to_square)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          customerId,
          null, // No order ID for manual check-in
          guestCount,
          new Date().toISOString(),
          0 // Not synced to Square (manual check-in)
        );
        db.close();
        // #region agent log
        fs.appendFileSync(logPath, JSON.stringify({location:'customerController.js:logCheckIn:after-db-insert-manual',message:'Manual check-in logged to database',data:{customerId,guestCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'}) + '\n');
        // #endregion
      } catch (dbError) {
        logger.error('Error logging to database:', dbError);
        // Continue even if DB logging fails
      }
      
      res.json({ success: true, checkIn: { customerId, guestCount, firstName, lastName, lotNumber } });
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