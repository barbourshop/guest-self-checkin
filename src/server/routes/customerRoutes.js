const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Customer search endpoints
router.post('/search/phone', customerController.searchByPhone);
router.post('/search/email', customerController.searchByEmail);
router.post('/search/lot', customerController.searchByLot);

// Admin endpoints
router.get('/admin/:customerId', customerController.getCustomerDetails);
router.post('/admin/:customerId/waiver', customerController.updateWaiverStatus);

router.get('/list', customerController.listCustomers);

// Check-in endpoint
router.post('/check-in', customerController.logCheckIn);

module.exports = router;