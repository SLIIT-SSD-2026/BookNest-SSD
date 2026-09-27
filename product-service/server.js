const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const productRoutes = require('./routes/productRoutes');

const app = express();

app.disable('x-powered-by');

// Avoid hanging requests when DB is unavailable.
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 5000);

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Product Service - Database Connected'))
  .catch((err) => console.error('Database connection error:', err));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'product-service' });
});

// Routes
// API Gateway mounts this service at '/api/products' and Express strips
// that prefix before the proxy middleware, so the product service sees
// paths like '/', '/categories', '/seller/:sellerId', etc.
// Therefore we mount the product routes at the root.
app.use('/', productRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Product Service running on port ${PORT}`);
});
