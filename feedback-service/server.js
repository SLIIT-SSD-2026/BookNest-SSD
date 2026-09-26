import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import feedbackRoutes from './routes/feedbackRoutes.js';
import Feedback from './models/Feedback.js';

dotenv.config();
const app = express();

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

app.use('/', feedbackRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Feedback service is running',
    timestamp: new Date().toISOString()
  });
});

const start = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('Missing MONGO_URI');
    }

    await mongoose.connect(process.env.MONGO_URI);
    await Feedback.syncIndexes();
    console.log('Feedback Service - Database Connected');

    const port = process.env.PORT;
    app.listen(port, () => {
      console.log(`Feedback Service running on port ${port}`);
    });
  } catch (error) {
    console.error('Feedback Service - Initialization error:', error.message);
    process.exit(1);
  }
};

start();
