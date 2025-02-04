const waiverService = require('../services/waiverService');

class WaiverController {
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