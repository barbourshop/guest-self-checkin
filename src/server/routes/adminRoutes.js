const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const asyncHandler = require('../utils/asyncHandler');

// Admin database endpoint
router.get('/database', asyncHandler(adminController.getDatabaseContents.bind(adminController)));

module.exports = router;

