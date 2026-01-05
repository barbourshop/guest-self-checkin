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
      if (!['phone', 'email', 'lot', 'name'].includes(type)) {
        return res.status(400).json({ error: `Invalid search type: ${type}. Must be 'phone', 'email', 'lot', or 'name'` });
      }

      // Get raw customer data from Square
      const rawCustomers = await customerService.searchCustomers(type, value, fuzzy);

      // Transform each customer to SearchResult format
      const { transformCustomer } = require('../utils/squareDataTransformers');
      const MembershipCache = require('../services/membershipCache');
      const membershipCache = new MembershipCache();

      // Get cache entries for all customers in one query if membership meta is requested
      let cacheMap = new Map();
      if (includeMembershipMeta) {
        try {
          const db = require('../db/database').initDatabase();
          const customerIds = rawCustomers.map(c => c.id);
          const placeholders = customerIds.map(() => '?').join(',');
          const cachedEntries = db.prepare(`
            SELECT customer_id, last_verified_at, membership_catalog_item_id, membership_variant_id, has_membership
            FROM membership_cache 
            WHERE customer_id IN (${placeholders})
          `).all(...customerIds);
          db.close();
          
          cachedEntries.forEach(cached => {
            cacheMap.set(cached.customer_id, cached);
          });
        } catch (error) {
          logger.error('Error fetching membership cache entries:', error);
        }
      }

      const transformedResults = await Promise.all(
        rawCustomers.map(async (customer) => {
          // Get membership metadata if requested
          let membershipMeta = null;
          if (includeMembershipMeta) {
            try {
              // Get membership status (uses cache if available)
              const status = await membershipCache.getMembershipStatus(customer.id, false);
              const cached = cacheMap.get(customer.id);
              
              membershipMeta = {
                hasMembership: status.hasMembership,
                fromCache: status.fromCache,
                catalogItemId: status.catalogItemId || null,
                variantId: status.variantId || null,
                lastVerifiedAt: cached?.last_verified_at || new Date().toISOString()
              };
            } catch (error) {
              logger.error(`Error getting membership metadata for ${customer.id}:`, error);
              // Continue without membership meta
            }
          }

          return transformCustomer(customer, membershipMeta, includeMembershipMeta);
        })
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
      
      // If orderId provided, verify it's a valid membership order
      // Note: The orderId in the barcode is a MEMBERSHIP order (from membership purchase)
      // Check-ins are logged locally, not as Square orders
      if (orderId) {
        const { MEMBERSHIP_CATALOG_ITEM_ID } = require('../config/square');
        let verification = null;
        
        try {
          // Get the order to verify it's a membership order
          const order = await squareService.getOrder(orderId);
          if (!order) {
            verification = { valid: false, reason: 'Order not found' };
          } else {
            // Check if it's a membership order (contains membership catalog item)
            const isMembershipOrder = order.line_items?.some(item => {
              if (MEMBERSHIP_CATALOG_ITEM_ID) {
                return item.catalog_object_id === MEMBERSHIP_CATALOG_ITEM_ID;
              }
              // If no membership catalog configured, accept any order with a customer
              return true;
            });
            
            if (isMembershipOrder) {
              // Verify membership status from cache
              const orderCustomerId = order.customer_id || customerId;
              if (orderCustomerId) {
                const MembershipCache = require('../services/membershipCache');
                const membershipCache = new MembershipCache();
                const membershipStatus = await membershipCache.getMembershipStatus(orderCustomerId);
                verification = {
                  valid: membershipStatus.hasMembership,
                  order,
                  customerId: orderCustomerId,
                  hasMembership: membershipStatus.hasMembership,
                  reason: membershipStatus.hasMembership ? undefined : 'Customer does not have active membership'
                };
              } else {
                verification = { valid: false, reason: 'Order does not have associated customer' };
              }
            } else {
              verification = { valid: false, reason: 'Order is not a membership order' };
            }
          }
        } catch (error) {
          logger.error(`Error verifying membership order ${orderId}:`, error);
          verification = { valid: false, reason: 'Order verification failed' };
        }
        
        if (!verification || !verification.valid) {
          return res.status(400).json({
            success: false,
            error: verification?.reason || 'An issue with check-in, please see the manager on duty'
          });
        }
        
        // Use customer ID from verified order
        const verifiedCustomerId = verification.customerId || customerId;
        const verifiedGuestCount = guestCount || 1; // Default to 1 if not provided
        // Use the orderId from req.body (the scanned order ID from the barcode)
        const verifiedOrderId = orderId || verification.order?.id || null;
        
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
          fs.appendFileSync(logPath, JSON.stringify({location:'customerController.js:logCheckIn:before-db-insert-qr',message:'About to insert QR check-in to database',data:{verifiedCustomerId,verifiedOrderId,verifiedGuestCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'}) + '\n');
          // #endregion
          db.prepare(`
            INSERT INTO checkin_log 
            (customer_id, order_id, guest_count, timestamp, synced_to_square)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            verifiedCustomerId,
            verifiedOrderId, // This is the membership order ID from the barcode
            verifiedGuestCount,
            new Date().toISOString(),
            0 // Check-ins are local records, not synced to Square (future: may create $0 check-in orders)
          );
          db.close();
          // #region agent log
          fs.appendFileSync(logPath, JSON.stringify({location:'customerController.js:logCheckIn:after-db-insert-qr',message:'QR check-in logged to database',data:{verifiedCustomerId,verifiedOrderId,verifiedGuestCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'}) + '\n');
          // #endregion
        } catch (dbError) {
          logger.error('Error logging to database:', dbError);
          // Continue even if DB logging fails
        }
        
        return res.json({ 
          success: true, 
          checkIn: { 
            customerId: verifiedCustomerId, 
            orderId: verifiedOrderId,
            guestCount: verifiedGuestCount, 
            firstName, 
            lastName, 
            lotNumber 
          } 
        });
      }
      
      // Manual check-in (customerId provided directly, no orderId in request)
      // Look up membership order ID from cache
      // Validate required fields
      if (!customerId || guestCount === undefined || !firstName || !lastName) {
        return res.status(400).json({ 
          success: false,
          error: 'Missing required fields: customerId, guestCount, firstName, lastName' 
        });
      }
      
      // Validate guest count is a positive number
      if (typeof guestCount !== 'number' || guestCount < 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Guest count must be a positive number' 
        });
      }
      
      // Look up membership order ID from cache
      let membershipOrderId = null;
      try {
        const MembershipCache = require('../services/membershipCache');
        const membershipCache = new MembershipCache();
        const membershipStatus = await membershipCache.getMembershipStatus(customerId);
        
        // Get order ID from cache if available
        if (membershipStatus.membershipOrderId) {
          membershipOrderId = membershipStatus.membershipOrderId;
        } else {
          // Try to get from cache entry directly
          const db = initDatabase();
          const cached = db.prepare(`
            SELECT membership_order_id FROM membership_cache WHERE customer_id = ?
          `).get(customerId);
          db.close();
          
          if (cached && cached.membership_order_id) {
            membershipOrderId = cached.membership_order_id;
          }
        }
      } catch (error) {
        logger.warn(`Could not retrieve membership order ID from cache for ${customerId}: ${error.message}`);
        // Continue without order ID - check-in can still proceed
      }
      
      // Log the check-in as a CSV row
      logCheckInCSV({ customerId, guestCount, firstName, lastName, lotNumber });
      
      // Also log to database
      try {
        const db = initDatabase();
        // #region agent log
        fs.appendFileSync(logPath, JSON.stringify({location:'customerController.js:logCheckIn:before-db-insert-manual',message:'About to insert manual check-in to database',data:{customerId,membershipOrderId,guestCount,firstName,lastName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'}) + '\n');
        // #endregion
        const result = db.prepare(`
          INSERT INTO checkin_log 
          (customer_id, order_id, guest_count, timestamp, synced_to_square)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          customerId,
          membershipOrderId, // Use membership order ID from cache
          guestCount,
          new Date().toISOString(),
          0 // Not synced to Square (manual check-in)
        );
        db.close();
        // #region agent log
        fs.appendFileSync(logPath, JSON.stringify({location:'customerController.js:logCheckIn:after-db-insert-manual',message:'Manual check-in logged to database',data:{customerId,membershipOrderId,guestCount,insertId:result.lastInsertRowid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'}) + '\n');
        // #endregion
        logger.info(`Manual check-in logged: customerId=${customerId}, orderId=${membershipOrderId || 'N/A'}, guestCount=${guestCount}, insertId=${result.lastInsertRowid}`);
      } catch (dbError) {
        logger.error('Error logging to database:', dbError);
        // Return error response instead of continuing
        return res.status(500).json({ 
          success: false,
          error: 'Failed to log check-in to database' 
        });
      }
      
      res.json({ 
        success: true, 
        checkIn: { 
          customerId, 
          orderId: membershipOrderId,
          guestCount, 
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

  /**
   * Get customer orders filtered by catalog item
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getCustomerOrders(req, res, next) {
    try {
      const { customerId } = req.params;
      const { catalogItemId } = req.query;
      const { MEMBERSHIP_CATALOG_ITEM_ID } = require('../config/square');
      const { transformCustomerOrder } = require('../utils/squareDataTransformers');

      if (!customerId) {
        return res.status(400).json({ error: 'Customer ID is required' });
      }

      // Fetch all orders for the customer
      const orders = await squareService.getCustomerOrders(customerId);

      // Use catalogItemId from query or fall back to config
      const targetCatalogItemId = catalogItemId || MEMBERSHIP_CATALOG_ITEM_ID;

      // If catalog item ID is provided, filter orders by it
      // Otherwise, return all orders (they'll be filtered on the frontend if needed)
      let filteredOrders;
      
      if (targetCatalogItemId) {
        // Filter orders that contain the membership catalog item
        filteredOrders = orders
          .filter(order => {
            if (!order.line_items || order.line_items.length === 0) {
              return false;
            }
            // Check if any line item matches the catalog item
            return order.line_items.some(item => 
              item.catalog_object_id === targetCatalogItemId
            );
          })
          .map(order => {
            // Filter line items to only include matching catalog items
            const filteredLineItems = order.line_items.filter(item => 
              item.catalog_object_id === targetCatalogItemId
            );

            // Create a new order object with filtered line items
            const orderWithFilteredItems = {
              ...order,
              line_items: filteredLineItems
            };

            // Transform using utility function
            return transformCustomerOrder(orderWithFilteredItems);
          });
      } else {
        // No catalog item ID configured - return all orders
        // The frontend can filter as needed
        filteredOrders = orders.map(order => transformCustomerOrder(order));
      }

      res.json({ orders: filteredOrders });
    } catch (error) {
      logger.error(`Error fetching customer orders: ${error.message}`);
      next(error);
    }
  }
}

module.exports = new CustomerController();