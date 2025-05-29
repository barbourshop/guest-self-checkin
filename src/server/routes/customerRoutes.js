const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const asyncHandler = require('../utils/asyncHandler');

// Customer search endpoints
router.post('/search/phone', asyncHandler(customerController.searchByPhone));
router.post('/search/email', asyncHandler(customerController.searchByEmail));
router.post('/search/lot', asyncHandler(customerController.searchByLot));

// Admin endpoints
router.get('/admin/:customerId', asyncHandler(customerController.getCustomerDetails));
router.post('/admin/:customerId/waiver', asyncHandler(customerController.updateWaiverStatus));

router.get('/list', asyncHandler(customerController.listCustomers));

// Check-in endpoint
router.post('/check-in', asyncHandler(customerController.logCheckIn));

// Returns all customer data for local search
router.get('/names', asyncHandler(customerController.getCustomerNames));

module.exports = router;