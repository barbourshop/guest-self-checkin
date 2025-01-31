require('dotenv').config();

const squareConfig = {
  apiUrl: process.env.SQUARE_API_URL,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  apiVersion: process.env.SQUARE_API_VERSION,
  headers: {
    'Square-Version': process.env.SQUARE_API_VERSION,
    'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

module.exports = squareConfig;