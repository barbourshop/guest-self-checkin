// This is the main entry point for the server
const express = require('express');
const cors = require('cors');
const path = require('path');
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
app.use(express.static(path.join(__dirname, '../../dist')));


// Handle any requests that don't match the above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
app.use(errorHandler);

module.exports = app;