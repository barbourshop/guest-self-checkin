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

// TODO - Add additional pool pass catalog IDs
// TODO - Externalize this as an environment variable since it wil change based on the environment (production vs sandbox)
const POOL_PASS_CATALOG_IDS = [
  '5P3J4MLH7EFZKG6FGWBGZ46G',  // Original pool pass ID
  // Additional pool pass IDs can be added here
];

// Middleware setup
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(express.static("public")); // Serve static files from the "public" directory

/**
 * Search Square customers by either email or phone
 * @param {string} searchType - Either 'email' or 'phone'
 * @param {string} searchValue - The email or phone to search for
 */
async function searchSquareCustomers(searchType, searchValue) {
  try {
    // Validate search parameters
    if (!['email', 'phone'].includes(searchType)) {
      throw new Error('Invalid search type. Must be either email or phone');
    }

    // Construct search query based on type
    const searchParams = {
      query: {
        filter: {
          [searchType === 'email' ? 'email_address' : 'phone_number']: {
            fuzzy: searchValue
          }
        }
      }
    };
    console.log('Search parameters:', JSON.stringify(searchParams, null, 2));
    const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/customers/search`, {
      method: 'POST',
      headers: SQUARE_API_CONFIG.headers,
      body: JSON.stringify(searchParams)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.detail || 'Square API request failed');
    }

    const data = await response.json();
    console.log('\n=== Search Results ===');
    console.log(`Found ${data.customers?.length || 0} customers`);
    console.log('Customer data:', JSON.stringify(data.customers, null, 2));
     // Get orders for each customer
     const customersWithOrders = await Promise.all((data.customers || []).map(async (customer) => {
      console.log(`\n=== Fetching orders for customer ${customer.id} ===`);
      const orders = await getCustomerOrders(customer.id);
      const hasPoolPass = orders.some(order => 
        order.line_items?.some(item => 
          POOL_PASS_CATALOG_IDS.includes(item.catalog_object_id)
        )
      );
      console.log(`Pool pass status for ${customer.id}: ${hasPoolPass}`);
      return { ...customer, orders, hasPoolPass };
    }));

    console.log('\n=== Final Results ===');
    console.log(`Processed ${customersWithOrders.length} customers`);
    return customersWithOrders;

  } catch (error) {
    console.error(`Error searching Square customers by ${searchType}:`, error);
    throw error;
  }
}

/**
 * Helper function to search customers in Square API.
 * 
 * @param {Object} searchParams - The search parameters to filter customers.
 * @returns {Promise<Array>} - A promise that resolves to an array of customer objects.
 * @throws Will throw an error if the Square API request fails.
 */
async function searchSquareOrders(searchParams) {
  console.log('Search Orders parameters:', JSON.stringify(searchParams, null, 2));
  try {
    const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/orders/search`, {
      method: 'POST',
      headers: SQUARE_API_CONFIG.headers,
      body: JSON.stringify({
        query: {
          filter: {
            customer_filter : {
              customer_ids : [searchParams]
            }
          }
        },
        "location_ids": [
          "LDH1GBS49SASE"
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.detail || 'Square API request failed');
    }

    const data = await response.json();
    console.log('Order data:', JSON.stringify(data.orders, null, 2));
    if (data.orders && data.orders.length > 0) {
      const hasPoolPass = data.orders.some(order => 
      order.line_items?.some(item => 
        POOL_PASS_CATALOG_IDS.includes(item.catalog_object_id)
      )
      );
      return hasPoolPass ? data.orders[0].customer_id : null;
    }
    return null;
  } catch (error) {
    console.error('Square API Error:', error);
    throw error;
  }
}

/**
 * Helper function to get customer orders in Square API.
 * 
 * @param {string} customerId - The customer ID to fetch orders for.
 * @returns {Promise<Array>} - A promise that resolves to an array of order objects.
 * @throws Will throw an error if the Square API request fails.
 */
async function getCustomerOrders(customerId) {
  console.log(`Fetching orders for customer: ${customerId}`);
  
  const response = await fetch(`${SQUARE_API_CONFIG.baseUrl}/orders/search`, {
    method: 'POST',
    headers: SQUARE_API_CONFIG.headers,
    body: JSON.stringify({
      query: {
        filter: {
          customer_filter : {
            customer_ids : [customerId]
          }
        }
      },
      "location_ids": [
        "LDH1GBS49SASE"
      ]
    })
  });

  if (!response.ok) {
    console.error(`Failed to fetch orders for customer ${customerId}`);
    throw new Error('Failed to fetch orders');
  }

  const data = await response.json();
  console.log(`Found ${data.orders?.length || 0} orders for customer ${customerId}`);
  console.log('Order details:', JSON.stringify(data.orders, null, 2));
  return data.orders || [];
}


async function checkWaiverStatus(customerId) {
  try {
    const response = await fetch(
      `${SQUARE_API_CONFIG.baseUrl}/customers/${customerId}/custom-attributes/waiver-signed`,
      {
        method: 'GET',
        headers: SQUARE_API_CONFIG.headers
      }
    );
    
    // If response is 404, waiver is not signed
    if (response.status === 404) {
      return false;
    }
    
    if (!response.ok) {
      throw new Error('Failed to check waiver status');
    }
    
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      return false;
    }
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
    const customers = await searchSquareCustomers('phone', phone);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    const customers = await searchSquareCustomers('email', email);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

app.get("/check-waiver/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const hasSignedWaiver = await checkWaiverStatus(customerId);
    res.json({ hasSignedWaiver });
  } catch (error) {
    res.status(500).json({ error: error.message });
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