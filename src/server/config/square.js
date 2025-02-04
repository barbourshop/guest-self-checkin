const SQUARE_API_CONFIG = {
    baseUrl: 'https://connect.squareupsandbox.com/v2',
    headers: {
      'Square-Version': '2025-01-23',
      'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  const POOL_PASS_CATALOG_IDS = [
    '5P3J4MLH7EFZKG6FGWBGZ46G',
  ];
  
  module.exports = {
    SQUARE_API_CONFIG,
    POOL_PASS_CATALOG_IDS
  };