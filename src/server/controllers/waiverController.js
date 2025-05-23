const waiverService = require('../services/waiverService');
const logger = require('../logger');

/**
 * Controller handling waiver-related operations
 * @class WaiverController
 */
class WaiverController {
  /**
   * Check if customer has signed waiver
   * @param {Request} req - Express request object with params: { customerId: string }
   * @param {Response} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Promise<void>} - JSON response with { hasSignedWaiver: boolean }
   * @throws {Error} Returns 500 if check fails
   */
  async checkStatus(req, res, next) {
    try {
      const { customerId } = req.params;
      const hasSignedWaiver = await waiverService.checkStatus(customerId);
      res.json({ hasSignedWaiver });
    } catch (error) {
      logger.error(`Check Waiver Status Error - ${error.message}`);
      next(error);
    }
  }

  /**
   * Set waiver status for a customer
   * @param {Request} req - Express request object with params: { customerId: string }
   * @param {Response} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Promise<void>} - JSON response with success status
   * @throws {Error} Returns 500 if setting fails
   */
  async setStatus(req, res, next) {
    try {
      const { customerId } = req.params;
      const { clear } = req.query;
      const isAdminAction = req.headers['x-admin-action'] === 'true';
      
      // Log waiver status update with source
      const source = isAdminAction ? 'ADMIN PANEL' : 'USER UI';
      logger.metric(`${clear ? 'Clear' : 'Set'} Waiver Status from ${source} - Customer ID: ${customerId}`);
      
      if (clear === 'true') {
        // Clear waiver status
        await waiverService.clearStatus(customerId);
        res.json({ success: true, message: 'Waiver status cleared' });
      } else {
        // Set waiver as signed
        await waiverService.setStatus(customerId);
        res.json({ success: true, message: 'Waiver status set to signed' });
      }
      
      // Log result with source
      logger.metric(`Waiver Status ${clear ? 'Cleared' : 'Set'} from ${source} - Customer ID: ${customerId}`);
    } catch (error) {
      logger.error(`${req.query.clear === 'true' ? 'Clear' : 'Set'} Waiver Status Error - ${error.message}`);
      next(error);
    }
  }
}

module.exports = new WaiverController();