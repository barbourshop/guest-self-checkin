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
 * Search customers by lot number
 * @param {Request} req - Express request object with body: { lot: string }
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - JSON response with customers array
 * @throws {Error} Returns 500 if search fails
 */
async searchByLot(req, res) {
  try {
    const { lot } = req.body;
    const customers = await squareService.searchCustomers('lot', lot);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

}

module.exports = new CustomerController();