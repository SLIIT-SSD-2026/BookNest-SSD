import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import sellerRoutes from './routes/sellerRoutes.js';

dotenv.config();
const app = express();

app.disable('x-powered-by');

// Middleware
app.use(cors());
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