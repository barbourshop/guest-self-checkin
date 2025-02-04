const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.post('/search-customers-phone', customerController.searchByPhone);
router.post('/search-customers-email', customerController.searchByEmail);
router.get('/list-customers', customerController.listCustomers);

module.exports = router;