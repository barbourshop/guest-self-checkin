#!/usr/bin/env node

/**
 * Seed script to populate the demo database with sample data
 * This creates realistic demo data for development/testing with mock Square service
 */

const { initDatabase, closeDatabase } = require('../db/database');
const MockSquareService = require('../services/mockSquareService');

// Set environment to use demo database
process.env.USE_DEMO_DB = 'true';

const mockService = new MockSquareService();

// Add demo customers from mockSquareHelpers
const { createMockSquareService } = require('../__tests__/helpers/mockSquareHelpers');
const demoService = createMockSquareService();

function seedDatabase() {
  console.log('Seeding demo database...');
  
  const db = initDatabase();
  
  try {
    // Ensure membership_order_id column exists (migration)
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(membership_cache)`).all();
      const hasOrderIdColumn = tableInfo.some(col => col.name === 'membership_order_id');
      if (!hasOrderIdColumn) {
        console.log('Adding membership_order_id column to membership_cache table...');
        db.exec(`ALTER TABLE membership_cache ADD COLUMN membership_order_id TEXT`);
        console.log('Migration completed: membership_order_id column added');
      }
    } catch (error) {
      // Table might not exist yet, which is fine - it will be created with the column
      console.log('Note: membership_cache table does not exist yet, will be created with membership_order_id column');
    }
    
    // Clear existing data
    console.log('Clearing existing data...');
    db.exec(`
      DELETE FROM membership_cache;
      DELETE FROM checkin_queue;
      DELETE FROM checkin_log;
    `);
    
    // Get all customers from mock service
    const customers = Array.from(demoService.customers.values());
    console.log(`Adding ${customers.length} customers to membership cache...`);
    
    // Seed membership cache with demo customers
    // First, get membership orders to map customer IDs to order IDs
    const now = new Date().toISOString();
    const MEMBERSHIP_SEGMENT_ID = 'MEMBERSHIP_SEGMENT_ID';
    const MEMBERSHIP_CATALOG_ITEM_ID = process.env.MEMBERSHIP_CATALOG_ITEM_ID || 'MEMBERSHIP_CATALOG_ITEM_ID';
    
    // Get membership orders from mock service first to create customer-to-order mapping
    const orders = Array.from(demoService.orders.values());
    const membershipOrders = orders.filter(order => {
      if (!order.line_items || order.line_items.length === 0) return false;
      return order.line_items.some(item => 
        item.catalog_object_id === MEMBERSHIP_CATALOG_ITEM_ID
      );
    });
    
    // Create a map of customer ID to membership order ID
    const customerToOrderMap = new Map();
    for (const order of membershipOrders) {
      if (order.customer_id && !customerToOrderMap.has(order.customer_id)) {
        customerToOrderMap.set(order.customer_id, order.id);
      }
    }
    
    // Check if membership_order_id column exists
    let hasOrderIdColumn = false;
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(membership_cache)`).all();
      hasOrderIdColumn = tableInfo.some(col => col.name === 'membership_order_id');
    } catch (error) {
      // Table might not exist yet - will be created with column
      hasOrderIdColumn = true;
    }
    
    // Prepare insert statement with or without membership_order_id
    const insertCache = hasOrderIdColumn 
      ? db.prepare(`
          INSERT OR REPLACE INTO membership_cache 
          (customer_id, has_membership, membership_catalog_item_id, membership_variant_id, membership_order_id, last_verified_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
      : db.prepare(`
          INSERT OR REPLACE INTO membership_cache 
          (customer_id, has_membership, membership_catalog_item_id, membership_variant_id, last_verified_at)
          VALUES (?, ?, ?, ?, ?)
        `);
    
    for (const customer of customers) {
      const hasMembership = customer.segment_ids && customer.segment_ids.includes(MEMBERSHIP_SEGMENT_ID);
      const membershipOrderId = hasMembership ? (customerToOrderMap.get(customer.id) || null) : null;
      
      if (hasOrderIdColumn) {
        insertCache.run(
          customer.id,
          hasMembership ? 1 : 0,
          hasMembership ? MEMBERSHIP_CATALOG_ITEM_ID : null,
          hasMembership ? 'MEMBERSHIP_VARIANT_ID' : null,
          membershipOrderId,
          now
        );
      } else {
        insertCache.run(
          customer.id,
          hasMembership ? 1 : 0,
          hasMembership ? MEMBERSHIP_CATALOG_ITEM_ID : null,
          hasMembership ? 'MEMBERSHIP_VARIANT_ID' : null,
          now
        );
      }
    }
    
    // Get membership orders from mock service to use for demo check-ins
    // Note: customerToOrderMap and membershipOrders were already created above when seeding membership_cache
    console.log(`Found ${membershipOrders.length} membership orders in mock service`);
    
    // Log the mappings for debugging
    console.log('Customer to Order ID mappings:');
    for (const [customerId, orderId] of customerToOrderMap.entries()) {
      console.log(`  ${customerId} -> ${orderId}`);
    }
    
    // Get member customers
    const memberCustomers = customers.filter(c => 
      c.segment_ids && c.segment_ids.includes(MEMBERSHIP_SEGMENT_ID)
    );
    
    // Add additional membership orders for customers that don't have them
    // This ensures we have order IDs for all members
    for (const customer of memberCustomers) {
      if (!customerToOrderMap.has(customer.id)) {
        // Create a demo order ID for this customer
        const orderId = `ORDER_MEMBERSHIP_${customer.id}`;
        customerToOrderMap.set(customer.id, orderId);
        console.log(`Creating membership order ${orderId} for ${customer.id}`);
        
        // Also add it to the mock service so it can be looked up
        demoService.addOrder({
          id: orderId,
          customer_id: customer.id,
          location_id: 'LOCATION_1',
          state: 'COMPLETED',
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          line_items: [
            {
              uid: `line_item_${customer.id}`,
              catalog_object_id: MEMBERSHIP_CATALOG_ITEM_ID,
              catalog_object_variant_id: 'MEMBERSHIP_VARIANT_ID',
              name: 'Membership',
              quantity: '1',
              variation_name: 'Annual Membership'
            }
          ],
          total_money: {
            amount: 50000,
            currency: 'USD'
          }
        });
        
        // Update the cache entry with the new order ID
        if (hasOrderIdColumn) {
          db.prepare(`
            UPDATE membership_cache 
            SET membership_order_id = ? 
            WHERE customer_id = ?
          `).run(orderId, customer.id);
          console.log(`Updated cache entry for ${customer.id} with order ID ${orderId}`);
        }
      }
    }
    
    // Add sample check-in logs in the immediate past (last few hours/days)
    console.log('Adding sample check-in logs with membership order IDs...');
    const insertLog = db.prepare(`
      INSERT INTO checkin_log 
      (customer_id, order_id, guest_count, timestamp, synced_to_square)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    let checkInCount = 0;
    if (memberCustomers.length > 0) {
      // Generate check-ins in the immediate past (last 3 days, more recent = more frequent)
      const guestCounts = [1, 2, 3, 4, 5]; // Various guest counts
      const now = new Date();
      
      // Create check-ins, most recent first
      // Today: 5-6 check-ins
      // Yesterday: 3-4 check-ins  
      // 2 days ago: 2-3 check-ins
      const checkInsToCreate = [
        { hoursAgo: 0, count: 5 },   // Today (last 24 hours)
        { hoursAgo: 24, count: 3 },  // Yesterday
        { hoursAgo: 48, count: 2 }   // 2 days ago
      ];
      
      // Collect all check-ins first, then insert them sorted by timestamp (newest first)
      const checkIns = [];
      
      for (const { hoursAgo, count } of checkInsToCreate) {
        for (let i = 0; i < count; i++) {
          // Select a random customer
          const customer = memberCustomers[Math.floor(Math.random() * memberCustomers.length)];
          
          // Select a random guest count (weighted toward 1-3 guests)
          const guestCount = guestCounts[Math.floor(Math.random() * guestCounts.length)];
          
          // Get the membership order ID for this customer
          const orderId = customerToOrderMap.get(customer.id);
          
          // Create timestamp for this check-in
          // Spread check-ins throughout the time period (between 8 AM and 8 PM)
          const hoursInDay = 8 + Math.floor(Math.random() * 12); // 8 AM to 8 PM
          const minutesInHour = Math.floor(Math.random() * 60);
          
          const timestamp = new Date(now);
          timestamp.setHours(timestamp.getHours() - hoursAgo);
          timestamp.setHours(hoursInDay, minutesInHour, 0, 0);
          
          // Use membership order ID for most check-ins (80% have order ID)
          const useOrderId = Math.random() > 0.2;
          
          checkIns.push({
            customerId: customer.id,
            orderId: useOrderId ? orderId : null,
            guestCount,
            timestamp: timestamp.toISOString()
          });
        }
      }
      
      // Add explicit recent check-ins with order IDs for easy testing
      // These ensure specific order IDs exist in the log for demo purposes
      
      // Add check-in for CUSTOMER_MEMBER_3 with their membership order (most recent - 1 hour ago)
      const member3OrderId = customerToOrderMap.get('CUSTOMER_MEMBER_3');
      if (member3OrderId) {
        const recentTimestamp = new Date(now);
        recentTimestamp.setHours(recentTimestamp.getHours() - 1); // 1 hour ago
        
        checkIns.push({
          customerId: 'CUSTOMER_MEMBER_3',
          orderId: member3OrderId, // ORDER_MEMBERSHIP_MEMBER_3
          guestCount: 1,
          timestamp: recentTimestamp.toISOString()
        });
        console.log(`Added demo check-in for CUSTOMER_MEMBER_3 with order ID: ${member3OrderId}`);
      }
      
      // Add check-in for CUSTOMER_MEMBER_1 with their membership order (2 hours ago)
      const member1OrderId = customerToOrderMap.get('CUSTOMER_MEMBER_1');
      if (member1OrderId) {
        const yesterdayTimestamp = new Date(now);
        yesterdayTimestamp.setHours(yesterdayTimestamp.getHours() - 2); // 2 hours ago
        
        checkIns.push({
          customerId: 'CUSTOMER_MEMBER_1',
          orderId: member1OrderId,
          guestCount: 2,
          timestamp: yesterdayTimestamp.toISOString()
        });
        console.log(`Added demo check-in for CUSTOMER_MEMBER_1 with order ID: ${member1OrderId}`);
      }
      
      // Add check-in for CUSTOMER_MEMBER_2 with their membership order (3 hours ago)
      const member2OrderId = customerToOrderMap.get('CUSTOMER_MEMBER_2');
      if (member2OrderId) {
        const twoDaysAgoTimestamp = new Date(now);
        twoDaysAgoTimestamp.setHours(twoDaysAgoTimestamp.getHours() - 3); // 3 hours ago
        
        checkIns.push({
          customerId: 'CUSTOMER_MEMBER_2',
          orderId: member2OrderId,
          guestCount: 1,
          timestamp: twoDaysAgoTimestamp.toISOString()
        });
        console.log(`Added demo check-in for CUSTOMER_MEMBER_2 with order ID: ${member2OrderId}`);
      }
      
      // Sort by timestamp (newest first) and insert
      checkIns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      for (const checkIn of checkIns) {
        insertLog.run(
          checkIn.customerId,
          checkIn.orderId,
          checkIn.guestCount,
          checkIn.timestamp,
          0 // Not synced to Square (demo mode)
        );
        checkInCount++;
      }
    }
    
    console.log('Demo database seeded successfully!');
    console.log(`- ${customers.length} customers in membership cache`);
    console.log(`- ${customerToOrderMap.size} customers with membership order IDs`);
    console.log(`- ${checkInCount} sample check-in logs`);
    
    // Verify membership cache entries have order IDs (if column exists)
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(membership_cache)`).all();
      const hasOrderIdColumn = tableInfo.some(col => col.name === 'membership_order_id');
      
      if (hasOrderIdColumn) {
        const cacheEntries = db.prepare(`
          SELECT customer_id, has_membership, membership_order_id 
          FROM membership_cache 
          WHERE has_membership = 1
        `).all();
        const withOrderIds = cacheEntries.filter(entry => entry.membership_order_id).length;
        console.log(`- ${withOrderIds} of ${cacheEntries.length} members have order IDs in cache`);
      } else {
        console.log(`- Note: membership_order_id column not yet available (will be added on next run)`);
      }
    } catch (error) {
      console.log(`- Note: Could not verify order IDs: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    closeDatabase(db);
  }
}

// Run if called directly
if (require.main === module) {
  try {
    seedDatabase();
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed database:', error);
    process.exit(1);
  }
}

module.exports = { seedDatabase };

