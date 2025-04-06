const squareService = require('../services/squareService');
const fs = require('fs');
const path = require('path');

/**
 * Controller handling customer-related operations
 * @class CustomerController
 */
class CustomerController {
  /**
   * Search customers by phone number
   * @param {Request} req - Express request object with body: { phone: string }
   * @param {Response} res - Express response object
   * @returns {Promise<void>} - JSON response with customers array
   * @throws {Error} Returns 500 if search fails
   */
  async searchByPhone(req, res) {
    try {
      const { phone } = req.body;
      
      // Log search request
      console.log(`${new Date().toISOString()} [ SEARCH BY PHONE ] Phone: ${phone}`);
      
      const customers = await squareService.searchCustomers('phone', phone);
      res.json(customers);
    } catch (error) {
      console.error(`${new Date().toISOString()} [ SEARCH BY PHONE ERROR ] ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Search customers by email address
   * @param {Request} req - Express request object with body: { email: string }
   * @param {Response} res - Express response object
   * @returns {Promise<void>} - JSON response with customers array
   * @throws {Error} Returns 500 if search fails
   */
  async searchByEmail(req, res) {
    try {
      const { email } = req.body;
      
      // Log search request
      console.log(`${new Date().toISOString()} [ SEARCH BY EMAIL ] Email: ${email}`);
      
      const customers = await squareService.searchCustomers('email', email);
      res.json(customers);
    } catch (error) {
      console.error(`${new Date().toISOString()} [ SEARCH BY EMAIL ERROR ] ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Search customers by lot number
   * @param {Request} req - Express request object with body: { lot: string }
   * @param {Response} res - Express response object
   * @returns {Promise<void>} - JSON response with customers array
   * @throws {Error} Returns 500 if search fails
   */
  async searchByLot(req, res) {
    try {
      const { lot } = req.body;
      
      // Log search request
      console.log(`${new Date().toISOString()} [ SEARCH BY LOT ] Lot: ${lot}`);
      
      const customers = await squareService.searchCustomers('lot', lot);
      res.json(customers);
    } catch (error) {
      console.error(`${new Date().toISOString()} [ SEARCH BY LOT ERROR ] ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * List all customers with pagination
   * @param {Request} req - Express request object with query: { limit?: number, cursor?: string }
   * @param {Response} res - Express response object
   * @returns {Promise<void>} - JSON response with customers and pagination data
   * @throws {Error} Returns 500 if listing fails
   */
  async listCustomers(req, res) {
    try {
      const { limit, cursor } = req.query;
      
      // Log list request
      console.log(`${new Date().toISOString()} [ LIST CUSTOMERS ] Limit: ${limit || 'default'}, Cursor: ${cursor || 'none'}`);
      
      const data = await squareService.listCustomers(limit, cursor);
      res.json(data);
    } catch (error) {
      console.error(`${new Date().toISOString()} [ LIST CUSTOMERS ERROR ] ${error.message}`);
      res.status(500).json({
        error: "Failed to list customers",
        detail: error.message
      });
    }
  }

  /**
   * Log a customer check-in
   * @param {Request} req - Express request object with body: { customerId: string, guestCount: number, firstName: string, lastName: string, lotNumber: string }
   * @param {Response} res - Express response object
   * @returns {Promise<void>} - JSON response with success status
   * @throws {Error} Returns 500 if check-in fails
   */
  async checkIn(req, res) {
    try {
      const { customerId, guestCount, firstName, lastName, lotNumber } = req.body;
      
      // Create log entry
      const timestamp = new Date().toISOString();
      const guestName = `${firstName} ${lastName}`;
      
      // Log to console with single line format
      console.log(`${timestamp} [ CHECK-IN ] Guest: ${guestName}, Count: ${guestCount}, Lot: ${lotNumber || 'N/A'}, ID: ${customerId}`);
      
      res.json({ success: true, message: "Check-in logged successfully" });
    } catch (error) {
      console.error(`${new Date().toISOString()} [ CHECK-IN ERROR ] ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new CustomerController();