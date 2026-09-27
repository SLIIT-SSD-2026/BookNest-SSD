import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticateToken, authorizeRole } from './middleware/auth.js';

dotenv.config();
const app = express();

app.disable('x-powered-by');

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "http://localhost:5000", "http://localhost:3000"]
  }
}));

app.use(cors());

// Auth Service (Public)
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
  })
);

// Seller Service
app.use('/api/sellers', 
  authenticateToken,
  authorizeRole('seller'),
  createProxyMiddleware({
    target: process.env.SELLER_SERVICE_URL,
    changeOrigin: true,
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
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[${new Date().toISOString()}] Proxying ${req.method} ${req.url} to PRODUCT SERVICE`);
    }
  })
);

// Feedback Service (Fixed double-pathing)
app.use('/api/feedback',
  authenticateToken,
  createProxyMiddleware({
    target: process.env.FEEDBACK_SERVICE_URL,
    changeOrigin: true,
  })
);

// Order Service
app.use('/api/orders',
  authenticateToken,
  authorizeRole('customer', 'seller', 'admin'),
  createProxyMiddleware({
    target: process.env.ORDER_SERVICE_URL,
    changeOrigin: true,
  })
);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});