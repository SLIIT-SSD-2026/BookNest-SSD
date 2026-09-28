import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticateToken, authorizeRole } from './middleware/auth.js';

dotenv.config();
const app = express();

app.disable('x-powered-by');

// Authentication rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Security headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "http://localhost:5000",
        "http://localhost:3000"
      ]
    }
  })
);

// Prevent MIME-type sniffing
app.use(helmet.noSniff());

// Prevent cross-origin framing
app.use(helmet.frameguard({ action: 'sameorigin' }));

// CORS configuration
const allowedOrigins = ['http://localhost:3000'];

if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*') {
  if (!allowedOrigins.includes(process.env.CORS_ORIGIN)) {
    allowedOrigins.push(process.env.CORS_ORIGIN);
  }
}

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  })
);

// Attach bearer token to proxied requests
const attachBearerToken = (proxyReq, req) => {
  if (req.token) {
    proxyReq.setHeader('Authorization', `Bearer ${req.token}`);
  }
};

// Auth Service (Public with login rate limiting)
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL,
  changeOrigin: true,
}));

// Customer Service
app.use('/api/customers', 
  authenticateToken, 
  createProxyMiddleware({
    target: process.env.CUSTOMER_SERVICE_URL,
    changeOrigin: true,
    on: { proxyReq: attachBearerToken }
  })
);

// Seller Service
app.use('/api/sellers', 
  authenticateToken,
  authorizeRole('seller'),
  createProxyMiddleware({
    target: process.env.SELLER_SERVICE_URL,
    changeOrigin: true,
    on: { proxyReq: attachBearerToken }
  })
);

// Product Service
app.use(
  '/api/products',
  authenticateToken,
  authorizeRole('seller', 'customer'),
  createProxyMiddleware({
    target: process.env.PRODUCT_SERVICE_URL,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        attachBearerToken(proxyReq, req);
        console.log(`[${new Date().toISOString()}] Proxying ${req.method} ${req.url} to PRODUCT SERVICE`);
      }
    }
  })
);

// Feedback Service (Fixed double-pathing)
app.use('/api/feedback',
  authenticateToken,
  createProxyMiddleware({
    target: process.env.FEEDBACK_SERVICE_URL,
    changeOrigin: true,
    on: { proxyReq: attachBearerToken }
  })
);

// Order Service
app.use('/api/orders',
  authenticateToken,
  authorizeRole('customer', 'seller', 'admin'),
  createProxyMiddleware({
    target: process.env.ORDER_SERVICE_URL,
    changeOrigin: true,
    on: { proxyReq: attachBearerToken }
  })
);

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

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});