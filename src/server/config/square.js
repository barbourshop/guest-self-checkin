const SQUARE_API_CONFIG = {
  baseUrl: process.env.SQUARE_API_URL,
  headers: {
    'Square-Version': process.env.SQUARE_API_VERSION,
    'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

// This is the custom attribute used to identify 
const MEMBERSHIP_ATTRIBUTE_KEY = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'square:a165388b-d8ce-4fc1-b8e0-6d1f2d8b8ada'
  : '2025-membership';

// This is the custom attribute used to identify the lot number of the customer
const LOT_NUMBER_ATTRIBUTE_KEY = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'reference_id'
  : 'reference_id';

module.exports = {
  SQUARE_API_CONFIG,
  MEMBERSHIP_ATTRIBUTE_KEY,
  LOT_NUMBER_ATTRIBUTE_KEY,
};