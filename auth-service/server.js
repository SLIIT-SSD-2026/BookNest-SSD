import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';

dotenv.config();
const app = express();

app.disable('x-powered-by');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', authRoutes);

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Auth Service - Database Connected");

    app.listen(process.env.PORT, () => {
      console.log(`Auth Service running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Auth Service - Initialization error:", error.message);
    process.exit(1);
  }
};

start();
