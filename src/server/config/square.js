const SQUARE_API_CONFIG = {
  baseUrl: process.env.SQUARE_API_URL,
  headers: {
    'Square-Version': process.env.SQUARE_API_VERSION,
    'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

const POOL_PASS_CATALOG_IDS = [
  '5P3J4MLH7EFZKG6FGWBGZ46G'
];

const MEMBERSHIP_SEGMENT_ID = 'gv2:TVR6JXEM4N5XQ2XV51GBKFDN74';

// New configuration for catalog item/variant-based membership
const MEMBERSHIP_CATALOG_ITEM_ID = process.env.MEMBERSHIP_CATALOG_ITEM_ID || '';
const MEMBERSHIP_VARIANT_ID = process.env.MEMBERSHIP_VARIANT_ID || '';

// Configuration for check-in catalog item/variant
const CHECKIN_CATALOG_ITEM_ID = process.env.CHECKIN_CATALOG_ITEM_ID || '';
const CHECKIN_VARIANT_ID = process.env.CHECKIN_VARIANT_ID || '';

// Cache TTL in hours (default: 1 hour)
const CACHE_TTL_HOURS = parseInt(process.env.CACHE_TTL_HOURS || '1', 10);

const LOT_NUMBER_ATTRIBUTE_KEY = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'reference_id'
  : 'reference_id';

module.exports = {
  SQUARE_API_CONFIG,
  POOL_PASS_CATALOG_IDS,
  MEMBERSHIP_SEGMENT_ID,
  MEMBERSHIP_CATALOG_ITEM_ID,
  MEMBERSHIP_VARIANT_ID,
  CHECKIN_CATALOG_ITEM_ID,
  CHECKIN_VARIANT_ID,
  CACHE_TTL_HOURS,
  LOT_NUMBER_ATTRIBUTE_KEY,
};