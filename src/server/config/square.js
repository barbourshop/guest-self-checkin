// Lazy-load ConfigService to avoid circular dependencies
let configService = null;
function getConfigService() {
  if (!configService) {
    const ConfigService = require('../services/configService');
    configService = new ConfigService();
  }
  return configService;
}

// Helper to get config value (database first, then env var, then default)
function getConfig(key, defaultValue = '') {
  try {
    return getConfigService().get(key, defaultValue);
  } catch (error) {
    // Fallback to environment variable if ConfigService fails
    return process.env[key] || defaultValue;
  }
}

// Helper to get numeric config value
function getNumericConfig(key, defaultValue = 0) {
  const value = getConfig(key, String(defaultValue));
  return parseInt(value, 10) || defaultValue;
}

const SQUARE_API_CONFIG = {
  get baseUrl() {
    return getConfig('SQUARE_API_URL', process.env.SQUARE_API_URL || 'https://connect.squareup.com/v2');
  },
  get headers() {
    return {
      'Square-Version': getConfig('SQUARE_API_VERSION', process.env.SQUARE_API_VERSION || '2025-10-16'),
      'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    };
  }
};

const POOL_PASS_CATALOG_IDS = [
  '5P3J4MLH7EFZKG6FGWBGZ46G'
];

// Membership is derived from customers in this Square customer segment (single source of truth)
function getMembershipSegmentId() {
  return getConfig('MEMBERSHIP_SEGMENT_ID', process.env.MEMBERSHIP_SEGMENT_ID || 'gv2:TVR6JXEM4N5XQ2XV51GBKFDN74');
}

const MEMBERSHIP_SEGMENT_ID = getMembershipSegmentId();

// Legacy: catalog item/variant used only for check-in order verification (not for membership determination)
function getMembershipCatalogItemId() {
  return getConfig('MEMBERSHIP_CATALOG_ITEM_ID', process.env.MEMBERSHIP_CATALOG_ITEM_ID || '53OFWEDVK453O6GBG52N3CM5');
}

function getMembershipVariantId() {
  return getConfig('MEMBERSHIP_VARIANT_ID', process.env.MEMBERSHIP_VARIANT_ID || '');
}

// Configuration for check-in catalog item/variant
function getCheckinCatalogItemId() {
  return getConfig('CHECKIN_CATALOG_ITEM_ID', process.env.CHECKIN_CATALOG_ITEM_ID || '');
}

function getCheckinVariantId() {
  return getConfig('CHECKIN_VARIANT_ID', process.env.CHECKIN_VARIANT_ID || '');
}

// Cache TTL in hours (default: 1 hour)
function getCacheTTLHours() {
  return getNumericConfig('CACHE_TTL_HOURS', 1);
}

// Bulk refresh configuration
// Very conservative defaults to avoid Square API rate limits
function getBulkRefreshConcurrency() {
  return getNumericConfig('BULK_REFRESH_CONCURRENCY', 1);
}

function getBulkRefreshRateLimitMs() {
  return getNumericConfig('BULK_REFRESH_RATE_LIMIT_MS', 2000);
}

function getBulkRefreshRequestDelayMs() {
  return getNumericConfig('BULK_REFRESH_REQUEST_DELAY_MS', 1000);
}

function getCacheRefreshAgeHours() {
  return getNumericConfig('CACHE_REFRESH_AGE_HOURS', 24);
}

// Export getters for backward compatibility
const MEMBERSHIP_CATALOG_ITEM_ID = getMembershipCatalogItemId();
const MEMBERSHIP_VARIANT_ID = getMembershipVariantId();
const CHECKIN_CATALOG_ITEM_ID = getCheckinCatalogItemId();
const CHECKIN_VARIANT_ID = getCheckinVariantId();
const CACHE_TTL_HOURS = getCacheTTLHours();
const BULK_REFRESH_CONCURRENCY = getBulkRefreshConcurrency();
const BULK_REFRESH_RATE_LIMIT_MS = getBulkRefreshRateLimitMs();
const BULK_REFRESH_REQUEST_DELAY_MS = getBulkRefreshRequestDelayMs();
const CACHE_REFRESH_AGE_HOURS = getCacheRefreshAgeHours();

const LOT_NUMBER_ATTRIBUTE_KEY = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'reference_id'
  : 'reference_id';

module.exports = {
  SQUARE_API_CONFIG,
  POOL_PASS_CATALOG_IDS,
  MEMBERSHIP_SEGMENT_ID,
  getMembershipSegmentId,
  // Export getters for dynamic config access
  getMembershipCatalogItemId,
  getMembershipVariantId,
  getCheckinCatalogItemId,
  getCheckinVariantId,
  getCacheTTLHours,
  getBulkRefreshConcurrency,
  getBulkRefreshRateLimitMs,
  getBulkRefreshRequestDelayMs,
  getCacheRefreshAgeHours,
  // Export static values for backward compatibility (will be stale if changed in DB)
  MEMBERSHIP_CATALOG_ITEM_ID,
  MEMBERSHIP_VARIANT_ID,
  CHECKIN_CATALOG_ITEM_ID,
  CHECKIN_VARIANT_ID,
  CACHE_TTL_HOURS,
  BULK_REFRESH_CONCURRENCY,
  BULK_REFRESH_RATE_LIMIT_MS,
  BULK_REFRESH_REQUEST_DELAY_MS,
  CACHE_REFRESH_AGE_HOURS,
  LOT_NUMBER_ATTRIBUTE_KEY,
};