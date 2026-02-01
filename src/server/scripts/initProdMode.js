#!/usr/bin/env node

/**
 * Display production mode environment variables for debugging
 */

const path = require('path');
const dotenv = require('dotenv');

function initProdMode() {
  // Load .env from project root (same as server) so we show the same values
  const projectRoot = path.resolve(__dirname, '..', '..');
  dotenv.config({ path: path.join(projectRoot, '.env') });
  dotenv.config({ path: path.join(process.cwd(), '.env') });

  console.log('Production Mode Configuration:\n');
  
  // Expected environment variables for production
  // Defaults match those in src/server/config/square.js
  const expectedVars = [
    { name: 'SQUARE_ENVIRONMENT', defaultValue: 'production (or sandbox)', required: false },
    { name: 'SQUARE_ACCESS_TOKEN', sensitive: true },
    { name: 'SQUARE_API_URL', defaultValue: '(derived from SQUARE_ENVIRONMENT if not set)', required: false },
    { name: 'SQUARE_API_VERSION', defaultValue: '2025-10-16', required: false },
    { name: 'MEMBERSHIP_CATALOG_ITEM_ID', defaultValue: '53OFWEDVK453O6GBG52N3CM5', required: false },
    { name: 'MEMBERSHIP_VARIANT_ID', required: false },
    { name: 'CHECKIN_CATALOG_ITEM_ID', required: false },
    { name: 'CHECKIN_VARIANT_ID', required: false },
    { name: 'CACHE_TTL_HOURS', defaultValue: '1', required: false },
    { name: 'BULK_REFRESH_CONCURRENCY', defaultValue: '1', required: false },
    { name: 'BULK_REFRESH_RATE_LIMIT_MS', defaultValue: '2000', required: false },
    { name: 'BULK_REFRESH_REQUEST_DELAY_MS', defaultValue: '1000', required: false },
    { name: 'CACHE_REFRESH_AGE_HOURS', defaultValue: '24', required: false },
    { name: 'PORT', defaultValue: '3000', required: false },
    { name: 'USE_MOCK_SQUARE_SERVICE', required: false }
  ];
  
  expectedVars.forEach(({ name, sensitive = false, defaultValue, required = true }) => {
    const value = process.env[name];
    let displayValue;
    
    if (value) {
      if (sensitive) {
        // Mask sensitive values (show last 4 chars)
        displayValue = value.length > 4 ? '***' + value.slice(-4) : '***';
      } else {
        displayValue = value;
      }
    } else if (defaultValue) {
      displayValue = `${defaultValue} (default)`;
    } else {
      displayValue = required ? 'NOT SET' : '(not set)';
    }
    
    const status = value ? '✅' : (required ? '❌' : '⚪');
    console.log(`  ${status} ${name}: ${displayValue}`);
  });
  
  console.log('\nMode: Production (Real Square API)');
  console.log('Database: checkin.db\n');
}

// Run if called directly
if (require.main === module) {
  initProdMode();
}

module.exports = { initProdMode };
