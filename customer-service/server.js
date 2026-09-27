import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import customerRoutes from './routes/customerRoutes.js';

dotenv.config();
const app = express();

app.disable('x-powered-by');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/customers', customerRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Customer service is running',
    timestamp: new Date().toISOString()
  });
});

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Customer Service - Database Connected");

    app.listen(process.env.PORT, () => {
      console.log(`Customer Service running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Customer Service - Initialization error:", error.message);
    process.exit(1);
  }
};

start();