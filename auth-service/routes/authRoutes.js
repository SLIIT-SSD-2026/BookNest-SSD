import express from 'express';
import { loginUser, registerUser, registerCustomer, registerSeller, verifyToken, logoutUser, googleAuth } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.post('/verify-token', verifyToken);
router.post('/logout', logoutUser);

router.post('/customers', registerCustomer);
router.post('/sellers', registerSeller);

export default router;