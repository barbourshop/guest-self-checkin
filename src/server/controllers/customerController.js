const squareService = require('../services/squareService');
const customerService = require('../services/customerService');
const fs = require('fs');
const path = require('path');

/**
 * Controller handling customer-related operations
 * @class CustomerController
 */
class CustomerController {
  /**
   * Search for customers by phone number
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async searchByPhone(req, res) {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      
      // Use customerService to search and enrich customer data
      const customers = await customerService.searchCustomers('phone', phone);
      
      res.json(customers);
    } catch (error) {
      console.error('Error searching by phone:', error);
      res.status(500).json({ error: 'Failed to search customers' });
    }
  }

  /**
   * Search for customers by email
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async searchByEmail(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Use customerService to search and enrich customer data
      const customers = await customerService.searchCustomers('email', email);
      
      res.json(customers);
    } catch (error) {
      console.error('Error searching by email:', error);
      res.status(500).json({ error: 'Failed to search customers' });
    }
  }

  /**
   * Search for customers by lot number
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async searchByLot(req, res) {
    try {
      const { lot } = req.body;
      
      if (!lot) {
        return res.status(400).json({ error: 'Lot number is required' });
      }
      
      // Use customerService to search and enrich customer data
      const customers = await customerService.searchCustomers('lot', lot);
      
      res.json(customers);
    } catch (error) {
      console.error('Error searching by lot:', error);
      res.status(500).json({ error: 'Failed to search customers' });
    }
  }

  /**
   * List all customers
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async listCustomers(req, res) {
    try {
      const { limit, cursor } = req.query;
      
      const result = await squareService.listCustomers(
        limit ? parseInt(limit, 10) : 5,
        cursor
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error listing customers:', error);
      res.status(500).json({ error: 'Failed to list customers' });
    }
  }

  /**
   * Get detailed customer information (admin only)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getCustomerDetails(req, res) {
    try {
      const { customerId } = req.params;
      const customer = await customerService.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json(customer);
    } catch (error) {
      console.error('Error getting customer details:', error);
      res.status(500).json({ error: 'Failed to get customer details' });
    }
  }

  /**
   * Update customer's waiver status
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async updateWaiverStatus(req, res) {
    try {
      const { customerId } = req.params;
      const { hasSignedWaiver } = req.body;

      if (typeof hasSignedWaiver !== 'boolean') {
        return res.status(400).json({ error: 'hasSignedWaiver must be a boolean' });
      }

      const updated = await customerService.updateWaiverStatus(customerId, hasSignedWaiver);
      
      if (!updated) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json({ success: true, hasSignedWaiver });
    } catch (error) {
      console.error('Error updating waiver status:', error);
      res.status(500).json({ error: 'Failed to update waiver status' });
    }
  }

  /**
   * Log a customer check-in
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async logCheckIn(req, res) {
    try {
      const { customerId, guestCount, firstName, lastName, lotNumber } = req.body;
      
      // Validate required fields
      if (!customerId || !guestCount || !firstName || !lastName) {
        return res.status(400).json({ 
          error: 'Missing required fields: customerId, guestCount, firstName, lastName' 
        });
      }
      
      // Validate guest count is a positive number
      if (typeof guestCount !== 'number' || guestCount < 0) {
        return res.status(400).json({ error: 'Guest count must be a positive number' });
      }
      
      // Log the check-in to console
      const checkInData = {
        customerId,
        guestCount,
        firstName,
        lastName,
        lotNumber,
        timestamp: new Date().toISOString()
      };
      
      console.log('CHECK-IN:', JSON.stringify(checkInData, null, 2));
      
      res.json({ success: true, checkIn: checkInData });
    } catch (error) {
      console.error('Error logging check-in:', error);
      res.status(500).json({ error: 'Failed to log check-in' });
    }
  }
}

module.exports = new CustomerController();