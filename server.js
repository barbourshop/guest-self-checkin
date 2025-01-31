const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Square API configuration
const SQUARE_API_CONFIG = {
  baseUrl: 'https://connect.squareupsandbox.com/v2',
  headers: {
    'Square-Version': '2025-01-23',
    'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

// Middleware setup
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(express.static("public")); // Serve static files from the "public" directory

/**
 * Helper function to search customers in Square API.
 * 
 * @param {Object} searchParams - The search parameters to filter customers.
 * @returns {Promise<Array>} - A promise that resolves to an array of customer objects.
 * @throws Will throw an error if the Square API request fails.
 */
async function searchSquareCustomers(searchParams) {
  try {
    const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/customers/search`, {
      method: 'POST',
      headers: SQUARE_API_CONFIG.headers,
      body: JSON.stringify({
        query: {
          filter: searchParams
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.detail || 'Square API request failed');
    }

    const data = await response.json();
    return data.customers || [];
  } catch (error) {
    console.error('Square API Error:', error);
    throw error;
  }
}

/**
 * Endpoint to search customers by phone number.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {void}
 */
app.post("/search-customers-phone", async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    console.log("Searching for phone:", phone);
    
    const customers = await searchSquareCustomers({
      phone_number: {
        fuzzy: phone
      }
    });

    res.json(customers);
  } catch (error) {
    console.error("Error searching customers by phone:", error);
    res.status(500).json({ 
      error: "Failed to fetch customers",
      detail: error.message 
    });
  }
});

/**
 * Endpoint to search customers by phone number.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {void}
 */
app.post("/search-customers-email", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    console.log("Searching for email:", email);
    
    const customers = await searchSquareCustomers({
      email_address: {
        fuzzy: email
      }
    });

    res.json(customers);
  } catch (error) {
    console.error("Error searching customers by email:", error);
    res.status(500).json({ 
      error: "Failed to fetch customers",
      detail: error.message 
    });
  }
});

// Endpoint to list customers (with pagination)
app.get("/list-customers", async (req, res) => {
  try {
    const { limit = 5, cursor } = req.query;
    
    const url = new URL(`${SQUARE_API_CONFIG.baseUrl}/customers`);
    url.searchParams.append('limit', limit);
    if (cursor) {
      url.searchParams.append('cursor', cursor);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: SQUARE_API_CONFIG.headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.detail || 'Failed to list customers');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error listing customers:", error);
    res.status(500).json({ 
      error: "Failed to list customers",
      detail: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal server error",
    detail: err.message
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});