const express = require('express');
const router = express.Router();
const waiverController = require('../controllers/waiverController');

router.get('/check-waiver/:customerId', waiverController.checkStatus);
router.post('/set-waiver/:customerId', waiverController.setStatus);

module.exports = router;