import express from 'express';
import rateLimit from 'express-rate-limit';
import { loginUser, registerUser, registerCustomer, registerSeller, verifyToken, logoutUser } from '../controllers/authController.js';

const router = express.Router();

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

router.post('/register', registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/verify-token', verifyToken);
router.post('/logout', logoutUser);

router.post('/customers', registerCustomer);
router.post('/sellers', registerSeller);

export default router;