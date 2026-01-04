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
    const now = new Date().toISOString();
    const MEMBERSHIP_SEGMENT_ID = 'MEMBERSHIP_SEGMENT_ID';
    
    const insertCache = db.prepare(`
      INSERT OR REPLACE INTO membership_cache 
      (customer_id, has_membership, membership_catalog_item_id, membership_variant_id, last_verified_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const customer of customers) {
      const hasMembership = customer.segment_ids && customer.segment_ids.includes(MEMBERSHIP_SEGMENT_ID);
      insertCache.run(
        customer.id,
        hasMembership ? 1 : 0,
        hasMembership ? 'MEMBERSHIP_CATALOG_ITEM_ID' : null,
        hasMembership ? 'MEMBERSHIP_VARIANT_ID' : null,
        now
      );
    }
    
    // Add sample check-in logs across multiple days
    console.log('Adding sample check-in logs across multiple days...');
    const insertLog = db.prepare(`
      INSERT INTO checkin_log 
      (customer_id, order_id, guest_count, timestamp, synced_to_square)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    // Get member customers
    const memberCustomers = customers.filter(c => 
      c.segment_ids && c.segment_ids.includes(MEMBERSHIP_SEGMENT_ID)
    );
    
    let checkInCount = 0;
    if (memberCustomers.length > 0) {
      // Generate check-ins across the last 14 days
      const daysAgo = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      const guestCounts = [1, 2, 3, 4, 5]; // Various guest counts
      
      // Create check-ins with some randomness
      for (let day = 0; day < daysAgo.length; day++) {
        const daysAgoValue = daysAgo[day];
        
        // Vary the number of check-ins per day (more recent days have more)
        // Today: 4-5, Yesterday: 3-4, Days 2-3: 2-3, Days 4-6: 1-2, Older: 0-1
        let checkInsPerDay;
        if (day === 0) {
          checkInsPerDay = 4 + Math.floor(Math.random() * 2); // 4-5
        } else if (day === 1) {
          checkInsPerDay = 3 + Math.floor(Math.random() * 2); // 3-4
        } else if (day < 4) {
          checkInsPerDay = 2 + Math.floor(Math.random() * 2); // 2-3
        } else if (day < 7) {
          checkInsPerDay = 1 + Math.floor(Math.random() * 2); // 1-2
        } else {
          checkInsPerDay = Math.floor(Math.random() * 2); // 0-1
        }
        
        for (let i = 0; i < checkInsPerDay; i++) {
          // Select a random customer
          const customer = memberCustomers[Math.floor(Math.random() * memberCustomers.length)];
          
          // Select a random guest count (weighted toward 1-3 guests)
          const guestCount = guestCounts[Math.floor(Math.random() * guestCounts.length)];
          
          // Create timestamp for this check-in
          // Add some randomness within the day (between 8 AM and 8 PM)
          const hoursInDay = 8 + Math.floor(Math.random() * 12); // 8 AM to 8 PM
          const minutesInHour = Math.floor(Math.random() * 60);
          
          const timestamp = new Date();
          timestamp.setDate(timestamp.getDate() - daysAgoValue);
          timestamp.setHours(hoursInDay, minutesInHour, 0, 0);
          
          insertLog.run(
            customer.id,
            null, // Manual check-in, no order ID
            guestCount,
            timestamp.toISOString(),
            0 // Not synced to Square (manual check-in)
          );
          checkInCount++;
        }
      }
    }
    
    console.log('Demo database seeded successfully!');
    console.log(`- ${customers.length} customers in membership cache`);
    console.log(`- ${checkInCount} sample check-in logs`);
    
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

