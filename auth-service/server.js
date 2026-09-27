import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';

dotenv.config();
const app = express();

app.disable('x-powered-by');

// Rate limiting middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute observation window
  max: 5, // Maximum 5 attempts per IP
  message: { success: false, message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(cors());
app.use(express.json());

// Apply rate limiter to login endpoints
app.use('/api/auth/login', loginLimiter);
app.use('/login', loginLimiter);

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
