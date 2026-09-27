import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import orderRoutes from './routes/orderRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT;

// Security middleware
app.use(helmet()); 

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Routes
app.use('/', orderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Order service is running',
    timestamp: new Date().toISOString(),
    service: 'order-service',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'BookNest Order Service API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      orders: '/api/orders',
      swagger: '/api-docs'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection and server start
const start = async () => {
  try {
    // Connect to MongoDB with better error handling
    console.log(' Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000, 
      retryWrites: true,
      retryReads: true
    });
    
    console.log(' Order Service - Database Connected Successfully');
    const maskedUri = process.env.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(` MongoDB: ${maskedUri}`);

    // Start server
    app.listen(PORT, () => {
      console.log(`\n Order Service running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Health Check: http://localhost:${PORT}/health`);
      console.log(` Orders API: http://localhost:${PORT}/api/orders\n`);
    });

  } catch (error) {
    console.error(' Order Service - Initialization Error:', error.message);
    console.error('Stack Trace:', error.stack);
    
    // Provide helpful troubleshooting tips
    if (error.code === 'ENOTFOUND' || error.code === 'EREFUSED' || error.message.includes('querySrv')) {
      console.error('\n Troubleshooting MongoDB Connection:');
      console.error('1. Check your internet connection');
      console.error('2. Verify MongoDB Atlas cluster is running and accessible');
      console.error('3. Check if your IP address is whitelisted in MongoDB Atlas');
      console.error('4. Try using a different DNS server (e.g., Google DNS: 8.8.8.8)');
      console.error('5. Check firewall/antivirus settings');
      console.error('6. Verify MongoDB connection string format\n');
    }
    
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

start();