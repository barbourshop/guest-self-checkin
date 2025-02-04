const waiverService = require('../services/waiverService');

/**
 * Controller handling waiver-related operations
 * @class WaiverController
 */
class WaiverController {
  /**
   * Check if customer has signed waiver
   * @param {Request} req - Express request object with params: { customerId: string }
   * @param {Response} res - Express response object
   * @returns {Promise<void>} - JSON response with { hasSignedWaiver: boolean }
   * @throws {Error} Returns 500 if check fails
   */
  async checkStatus(req, res) {
    try {
      const { customerId } = req.params;
      console.log('Checking Waiver Status for customerId', customerId);
      const hasSignedWaiver = await waiverService.checkStatus(customerId);
      res.json({ hasSignedWaiver });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Set customer's waiver as signed
   * @param {Request} req - Express request object with params: { customerId: string }
   * @param {Response} res - Express response object
   * @returns {Promise<void>} - JSON response with operation result
   * @throws {Error} Returns 500 if operation fails
   */
  async setStatus(req, res) {
    try {
      const { customerId } = req.params;
      const result = await waiverService.setStatus(customerId);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Failed to set waiver status",
        detail: error.message
      });
    }
  }
}

module.exports = new WaiverController();