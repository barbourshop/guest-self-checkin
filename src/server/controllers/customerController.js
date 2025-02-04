const squareService = require('../services/squareService');

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
      const customers = await squareService.searchCustomers('phone', phone);
      res.json(customers);
    } catch (error) {
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
      const customers = await squareService.searchCustomers('email', email);
      res.json(customers);
    } catch (error) {
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
      const data = await squareService.listCustomers(limit, cursor);
      res.json(data);
    } catch (error) {
      res.status(500).json({
        error: "Failed to list customers",
        detail: error.message
      });
    }
  }
}

module.exports = new CustomerController();