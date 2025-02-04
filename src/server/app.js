/**
 * Express application setup and configuration
 * 
 * Available Endpoints:
 * 
 * Customer Routes (/api/customers):
 * - POST /search-phone - Search customers by phone number
 *   body: { phone: string }
 * 
 * - POST /search-email - Search customers by email
 *   body: { email: string }
 * 
 * - GET / - List all customers
 *   query: { limit?: number, cursor?: string }
 * 
 * Waiver Routes (/api/waivers):
 * - GET /:customerId - Check waiver status
 *   response: { hasSignedWaiver: boolean }
 * 
 * - POST /:customerId - Set waiver as signed
 *   response: { success: boolean }
 * 
 * @module app
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const customerRoutes = require('./routes/customerRoutes');
const waiverRoutes = require('./routes/waiverRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.use('/api/customers', customerRoutes);
app.use('/api/waivers', waiverRoutes);
app.use(errorHandler);

module.exports = app;