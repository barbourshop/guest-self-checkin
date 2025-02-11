const squareService = require('../services/squareService');

/**
 * Controller handling customer-related operations
 * @class CustomerController
 */
class CustomerController {
  constructor(service) {
    this.squareService = service;
  }

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

      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      const customers = await squareService.searchCustomers('phone', phone);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: `Error searching customers by phone: ${error.message}` });
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

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      const customers = await squareService.searchCustomers('email', email);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: `Error searching customers by email: ${error.message}` });
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
      if (!limit || !cursor) {
        return res.status(400).json({ error: 'Limit and cursor are required' });
      }
      const data = await squareService.listCustomers(limit, cursor);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: `Error searching customers by email: ${error.message}` });
    }
  }
}

module.exports = {
  CustomerController,
  controller: new CustomerController(squareService)
};