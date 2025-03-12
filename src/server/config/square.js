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

const MEMBERSHIP_ATTRIBUTE_KEY = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'square:a165388b-d8ce-4fc1-b8e0-6d1f2d8b8ada'
  : '2025-membership';

const LOT_NUMBER_ATTRIBUTE_KEY = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'reference_id'
  : 'reference_id';

module.exports = {
  SQUARE_API_CONFIG,
  POOL_PASS_CATALOG_IDS,
  MEMBERSHIP_ATTRIBUTE_KEY,
  LOT_NUMBER_ATTRIBUTE_KEY,
};