const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const asyncHandler = require('../utils/asyncHandler');

// Admin database endpoint
router.get('/database', asyncHandler(adminController.getDatabaseContents.bind(adminController)));

// Cache management endpoints
router.get('/cache/status', asyncHandler(adminController.getCacheStatus.bind(adminController)));
router.get('/cache/progress', asyncHandler(adminController.getCacheProgress.bind(adminController)));
router.post('/cache/refresh', asyncHandler(adminController.refreshCache.bind(adminController)));
router.post('/cache/clear', asyncHandler(adminController.clearCache.bind(adminController)));

// Customer segments (Square segment ID + display name)
router.get('/segments', asyncHandler(adminController.getSegments.bind(adminController)));
router.get('/segments/square', asyncHandler(adminController.getSquareSegments.bind(adminController)));
router.post('/segments', asyncHandler(adminController.addSegment.bind(adminController)));
router.put('/segments/:segmentId', asyncHandler(adminController.updateSegment.bind(adminController)));
router.delete('/segments/:segmentId', asyncHandler(adminController.deleteSegment.bind(adminController)));

// Configuration management endpoints
router.get('/config', asyncHandler(adminController.getConfig.bind(adminController)));
router.put('/config', asyncHandler(adminController.updateConfig.bind(adminController)));

module.exports = router;

