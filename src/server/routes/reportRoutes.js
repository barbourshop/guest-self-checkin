const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const asyncHandler = require('../utils/asyncHandler');

router.get(
  '/daily-checkins',
  asyncHandler(reportController.getDailyCheckins.bind(reportController))
);

router.get(
  '/daily-checkins/download',
  asyncHandler(reportController.downloadDailyCheckins.bind(reportController))
);

module.exports = router;

