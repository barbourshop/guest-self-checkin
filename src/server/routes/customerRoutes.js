const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Customer search endpoints
router.post('/search/phone', customerController.searchByPhone);
router.post('/search/email', customerController.searchByEmail);
router.post('/search/lot', customerController.searchByLot);
router.get('/list', customerController.listCustomers);

module.exports = router;