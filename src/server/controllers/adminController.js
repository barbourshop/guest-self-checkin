const { initDatabase } = require('../db/database');
const logger = require('../logger');
const squareService = require('../services/squareService');

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
    // Get unique customer IDs
    const customerIds = [...new Set(entries.map(entry => entry[customerIdField]).filter(Boolean))];
    
    // Fetch customer details (with error handling for missing customers)
    const customerMap = new Map();
    await Promise.all(
      customerIds.map(async (customerId) => {
        try {
          const customer = await squareService.getCustomer(customerId);
          customerMap.set(customerId, {
            given_name: customer.given_name || '',
            family_name: customer.family_name || '',
            email_address: customer.email_address || '',
            phone_number: customer.phone_number || '',
            reference_id: customer.reference_id || ''
          });
        } catch (error) {
          // Customer not found or error - leave fields empty
          logger.debug(`Could not fetch customer ${customerId}: ${error.message}`);
          customerMap.set(customerId, {
            given_name: '',
            family_name: '',
            email_address: '',
            phone_number: '',
            reference_id: ''
          });
        }
      })
    );
    
    // Enrich entries with customer details
    return entries.map(entry => {
      const customerId = entry[customerIdField];
      const customerDetails = customerMap.get(customerId) || {
        given_name: '',
        family_name: '',
        email_address: '',
        phone_number: '',
        reference_id: ''
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
      
      // Query membership_cache table
      const membershipCache = db.prepare(`
        SELECT 
          customer_id,
          has_membership,
          membership_catalog_item_id,
          membership_variant_id,
          last_verified_at
        FROM membership_cache
        ORDER BY last_verified_at DESC
      `).all();
      
      // Query checkin_queue table
      const checkinQueue = db.prepare(`
        SELECT 
          id,
          customer_id,
          order_id,
          guest_count,
          status,
          created_at,
          synced_at
        FROM checkin_queue
        ORDER BY created_at DESC
      `).all();
      
      // Query checkin_log table
      const checkinLog = db.prepare(`
        SELECT 
          id,
          customer_id,
          order_id,
          guest_count,
          timestamp,
          synced_to_square
        FROM checkin_log
        ORDER BY timestamp DESC
        LIMIT 1000
      `).all();
      
      db.close();
      
      // Enrich with customer details
      const enrichedMembershipCache = await this._enrichWithCustomerDetails(membershipCache);
      const enrichedCheckinQueue = await this._enrichWithCustomerDetails(checkinQueue);
      const enrichedCheckinLog = await this._enrichWithCustomerDetails(checkinLog);
      
      const result = {
        membershipCache: enrichedMembershipCache,
        checkinQueue: enrichedCheckinQueue,
        checkinLog: enrichedCheckinLog
      };
      
      res.json(result);
    } catch (error) {
      logger.error(`Error getting database contents: ${error.message}`);
      next(error);
    }
  }
}

module.exports = new AdminController();

