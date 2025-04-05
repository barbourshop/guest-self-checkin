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
      
      // Log waiver status check
      console.log(`${new Date().toISOString()} [ CHECK WAIVER STATUS ] Customer ID: ${customerId}`);
      
      const hasSignedWaiver = await waiverService.checkStatus(customerId);
      
      // Log result
      console.log(`${new Date().toISOString()} [ WAIVER STATUS RESULT ] Customer ID: ${customerId}, Has Signed: ${hasSignedWaiver}`);
      
      res.json({ hasSignedWaiver });
    } catch (error) {
      console.error(`${new Date().toISOString()} [ CHECK WAIVER STATUS ERROR ] ${error.message}`);
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
      
      // Log waiver status update
      console.log(`${new Date().toISOString()} [ SET WAIVER STATUS ] Customer ID: ${customerId}`);
      
      const result = await waiverService.setStatus(customerId);
      
      // Log result
      console.log(`${new Date().toISOString()} [ WAIVER STATUS UPDATED ] Customer ID: ${customerId}, Result: ${JSON.stringify(result)}`);
      
      res.json(result);
    } catch (error) {
      console.error(`${new Date().toISOString()} [ SET WAIVER STATUS ERROR ] ${error.message}`);
      res.status(500).json({
        error: "Failed to set waiver status",
        detail: error.message
      });
    }
  }
}

module.exports = new WaiverController();