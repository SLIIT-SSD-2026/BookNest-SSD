import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import sellerRoutes from './routes/sellerRoutes.js';

dotenv.config();
const app = express();

app.disable('x-powered-by');

// Middleware
const allowedOrigins = ['http://localhost:3000'];
if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*') {
  if (!allowedOrigins.includes(process.env.CORS_ORIGIN)) {
    allowedOrigins.push(process.env.CORS_ORIGIN);
  }
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));
app.use(express.json());

// Routes
app.use('/', sellerRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Seller service is running',
    timestamp: new Date().toISOString()
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  // Log full debug info internally
  console.error(`[Error] ${req.method} ${req.url}:`, err.stack);

  // Return a generic, sanitized error structure to clients
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500
      ? "An internal server error occurred. Please contact support."
      : err.message
  });
});

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Seller Service - Database Connected");

    app.listen(process.env.PORT, () => {
      console.log(`Seller Service running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Seller Service - Initialization error:", error.message);
    process.exit(1);
  }
};

start();