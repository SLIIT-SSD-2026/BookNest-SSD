import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticateToken, authorizeRole } from './middleware/auth.js';

dotenv.config();
const app = express();

app.use(cors());
// CWE-1021: refuse to be embedded in a cross-origin iframe.
app.use(helmet.frameguard({ action: 'sameorigin' }));
// CWE-693: tell browsers to honor the declared Content-Type.
app.use(helmet.noSniff());

const attachBearerToken = (proxyReq, req) => {
  if (req.token) {
    proxyReq.setHeader('Authorization', `Bearer ${req.token}`);
  }
};

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

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});