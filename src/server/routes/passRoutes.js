const express = require('express');
const router = express.Router();
const CheckinVerification = require('../services/checkinVerification');
const logger = require('../logger');
const { transformOrder } = require('../utils/squareDataTransformers');

// Utility to wrap async route handlers (same as in app.js)
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Create checkin verification instance
const checkinVerification = new CheckinVerification();

/**
 * Validate pass (QR code / order ID)
 * POST /api/passes/validate
 * Body: { token: string, deviceId?: string }
 * Response: { status: string, order: OrderDetails }
 */
router.post('/validate', asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ 
      status: 'invalid',
      order: null,
      error: 'Token is required' 
    });
  }
  
  try {
    const { initDatabase } = require('../db/database');
    const squareService = require('../services/squareService');
    const { MEMBERSHIP_CATALOG_ITEM_ID } = require('../config/square');
    const db = initDatabase();
    
    // Step 1: Check local database first (checkin_log) for order ID
    let order = null;
    let customerId = null;
    
    try {
      // Check if this order ID was used before in check-in log
      const logEntry = db.prepare(`
        SELECT customer_id, order_id 
        FROM checkin_log 
        WHERE order_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `).get(token);
      
      if (logEntry && logEntry.customer_id) {
        customerId = logEntry.customer_id;
        
        // Verify the customer still has membership in cache
        const membershipEntry = db.prepare(`
          SELECT has_membership, membership_catalog_item_id, membership_variant_id, last_verified_at
          FROM membership_cache
          WHERE customer_id = ? AND has_membership = 1
        `).get(customerId);
        
        if (membershipEntry) {
          // Customer has membership in cache - construct a valid order response
          // We'll create a minimal order object from cached data
          logger.info(`Order ${token} found in local database for customer ${customerId}`);
          
          // Try to get the actual order from Square if available (for full order details)
          // But don't fail if Square is unavailable - we have enough info from cache
          try {
            // Only query Square if not in demo/mock mode (production)
            if (process.env.USE_MOCK_SQUARE_SERVICE !== 'true') {
              order = await squareService.getOrder(token);
            }
          } catch (error) {
            // Order not found in Square, but we have it in local DB - continue
            logger.warn(`Order ${token} not found in Square, but exists in local database`);
            
            // Construct minimal order from cached data for validation
            // This allows offline check-in based on previously validated orders
            order = {
              id: token,
              customer_id: customerId,
              location_id: '', // Not stored in cache
              state: 'COMPLETED',
              created_at: membershipEntry.last_verified_at,
              line_items: [{
                catalog_object_id: membershipEntry.membership_catalog_item_id,
                catalog_object_variant_id: membershipEntry.membership_variant_id,
                name: 'Membership',
                variation_name: 'Membership',
                quantity: '1'
              }],
              total_money: null
            };
          }
        }
      }
    } catch (dbError) {
      logger.error(`Error checking local database: ${dbError.message}`);
      // Continue to Square lookup
    } finally {
      db.close();
    }
    
    // Step 2: If not found locally, query Square (production mode only)
    if (!order) {
      // Only query Square in production (not in demo/mock mode)
      const isProduction = process.env.USE_MOCK_SQUARE_SERVICE !== 'true';
      
      if (isProduction) {
        try {
          order = await squareService.getOrder(token);
          
          // Verify it's a membership order
          if (order && order.line_items) {
            const isMembershipOrder = order.line_items.some(item => {
              if (MEMBERSHIP_CATALOG_ITEM_ID) {
                return item.catalog_object_id === MEMBERSHIP_CATALOG_ITEM_ID;
              }
              // If no membership catalog item configured, accept any order
              return true;
            });
            
            if (!isMembershipOrder && MEMBERSHIP_CATALOG_ITEM_ID) {
              logger.warn(`Order ${token} does not contain membership catalog item`);
              return res.json({
                status: 'invalid',
                order: null
              });
            }
          }
        } catch (error) {
          // Order not found in Square
          logger.error(`Order not found in Square: ${token}`);
          return res.json({
            status: 'invalid',
            order: null
          });
        }
      } else {
        // Demo/mock mode - try to get order from mock service
        try {
          order = await squareService.getOrder(token);
          
          // Verify it's a membership order
          if (order && order.line_items) {
            const isMembershipOrder = order.line_items.some(item => {
              if (MEMBERSHIP_CATALOG_ITEM_ID) {
                return item.catalog_object_id === MEMBERSHIP_CATALOG_ITEM_ID;
              }
              // If no membership catalog item configured, accept any order
              return true;
            });
            
            if (!isMembershipOrder && MEMBERSHIP_CATALOG_ITEM_ID) {
              logger.warn(`Order ${token} does not contain membership catalog item`);
              return res.json({
                status: 'invalid',
                order: null
              });
            }
          }
        } catch (error) {
          // Order not found in mock service either
          logger.warn(`Order ${token} not found in local database or mock service`);
          return res.json({
            status: 'invalid',
            order: null
          });
        }
      }
    }
    
    if (!order) {
      return res.json({
        status: 'invalid',
        order: null
      });
    }
    
    // Mark as access verified for member card/check-in
    order.accessVerified = true;
    
    // Get customer ID from order (from either local DB lookup or Square order)
    if (!customerId && order.customer_id) {
      customerId = order.customer_id;
    }
    
    // Transform order to match PassValidationResponse format using utility
    const orderDetails = transformOrder(order);
    
    res.json({
      status: 'valid',
      order: orderDetails,
      customerId: customerId || undefined // Include customer ID for frontend to look up customer details
    });
  } catch (error) {
    logger.error(`Error validating pass: ${error.message}`);
    res.json({
      status: 'invalid',
      order: null
    });
  }
}));

module.exports = router;

