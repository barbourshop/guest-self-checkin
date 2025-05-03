const express = require('express');
const router = express.Router();
const waiverController = require('../controllers/waiverController');
const asyncHandler = require('../utils/asyncHandler');

router.get('/check-waiver/:customerId', asyncHandler(waiverController.checkStatus));
router.post('/set-waiver/:customerId', asyncHandler(waiverController.setStatus));

module.exports = router;