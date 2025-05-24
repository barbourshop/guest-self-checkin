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

const LOT_NUMBER_ATTRIBUTE_KEY = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'reference_id'
  : 'reference_id';

module.exports = {
  SQUARE_API_CONFIG,
  POOL_PASS_CATALOG_IDS,
  MEMBERSHIP_SEGMENT_ID,
  LOT_NUMBER_ATTRIBUTE_KEY,
};