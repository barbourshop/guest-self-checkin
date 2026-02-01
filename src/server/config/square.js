/**
 * Square API config — SQUARE_API_URL, SQUARE_ACCESS_TOKEN, SQUARE_API_VERSION, SQUARE_ENVIRONMENT from .env only.
 */

function env(key, defaultValue = '') {
  const v = process.env[key];
  return (v != null && String(v).trim()) || defaultValue;
}

function envNum(key, defaultValue = 0) {
  const v = env(key, String(defaultValue));
  return parseInt(v, 10) || defaultValue;
}

// Use only the first line and strip cruft (.env can have trailing lines or paste junk)
function cleanEnv(value) {
  if (value == null || typeof value !== 'string') return '';
  const firstLine = value.split(/\r\n|\r|\n/)[0] || '';
  return firstLine
    .replace(/^\s+|\s+$/g, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s/g, '');
}

const SQUARE_API_CONFIG = {
  get baseUrl() {
    return cleanEnv(process.env.SQUARE_API_URL);
  },
  get headers() {
    const token = cleanEnv(process.env.SQUARE_ACCESS_TOKEN);
    const version = cleanEnv(process.env.SQUARE_API_VERSION);
    return {
      'Content-Type': 'application/json',
      'Square-Version': version,
      'Authorization': `Bearer ${token}`
    };
  }
};

const POOL_PASS_CATALOG_IDS = [
  '5P3J4MLH7EFZKG6FGWBGZ46G'
];

function getMembershipSegmentId() {
  return env('MEMBERSHIP_SEGMENT_ID', 'gv2:TVR6JXEM4N5XQ2XV51GBKFDN74');
}

const MEMBERSHIP_SEGMENT_ID = getMembershipSegmentId();

function getMembershipCatalogItemId() {
  return env('MEMBERSHIP_CATALOG_ITEM_ID', '53OFWEDVK453O6GBG52N3CM5');
}

function getMembershipVariantId() {
  return env('MEMBERSHIP_VARIANT_ID', '');
}

function getCheckinCatalogItemId() {
  return env('CHECKIN_CATALOG_ITEM_ID', '');
}

function getCheckinVariantId() {
  return env('CHECKIN_VARIANT_ID', '');
}

function getCacheTTLHours() {
  return envNum('CACHE_TTL_HOURS', 1);
}

function getBulkRefreshConcurrency() {
  return envNum('BULK_REFRESH_CONCURRENCY', 1);
}

function getBulkRefreshRateLimitMs() {
  return envNum('BULK_REFRESH_RATE_LIMIT_MS', 2000);
}

function getBulkRefreshRequestDelayMs() {
  return envNum('BULK_REFRESH_REQUEST_DELAY_MS', 1000);
}

function getCacheRefreshAgeHours() {
  return envNum('CACHE_REFRESH_AGE_HOURS', 24);
}

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
  getMembershipCatalogItemId,
  getMembershipVariantId,
  getCheckinCatalogItemId,
  getCheckinVariantId,
  getCacheTTLHours,
  getBulkRefreshConcurrency,
  getBulkRefreshRateLimitMs,
  getBulkRefreshRequestDelayMs,
  getCacheRefreshAgeHours,
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
