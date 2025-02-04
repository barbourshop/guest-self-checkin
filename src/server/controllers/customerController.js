const squareService = require('../services/squareService');

class CustomerController {
  async searchByPhone(req, res) {
    try {
      const { phone } = req.body;
      const customers = await squareService.searchCustomers('phone', phone);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async searchByEmail(req, res) {
    try {
      const { email } = req.body;
      const customers = await squareService.searchCustomers('email', email);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

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