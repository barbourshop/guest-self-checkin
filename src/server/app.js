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