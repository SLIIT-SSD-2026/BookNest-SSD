import jwt from 'jsonwebtoken';
import axios from 'axios';
import validator from 'validator';
import User from '../models/User.js';
import Blacklist from '../models/Blacklist.js';

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Normalize the customer service base URL (removes trailing slash and /api/customers if present)
const normalizeCustomerServiceBase = () => {
  let base = (process.env.CUSTOMER_SERVICE_URL || '').trim().replace(/\/$/, '');
  base = base.replace(/\/api\/customers\/?$/i, '');
  return base;
};

// Create customer profile in customer service
const createCustomerProfile = async (user) => {
  try {
    const customerServiceBase = normalizeCustomerServiceBase();
    const customerData = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      createDate: user.createDate
    };

    const url = `${customerServiceBase}/api/customers/`;
    console.log('Creating customer profile at:', url);
    console.log('Customer data:', customerData);

    const response = await axios.post(url, customerData, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Customer profile creation response:', response.data);
  } catch (error) {
    console.error('Error creating customer profile:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
};

// Create seller profile in seller service
const createSellerProfile = async (user) => {
  try {
    const sellerServiceUrl = process.env.SELLER_SERVICE_URL;

    const sellerData = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      createDate: user.createDate
    };

    console.log('Creating seller profile at:', `${sellerServiceUrl}/api/sellers/`);

    const response = await axios.post(`${sellerServiceUrl}/api/sellers/`, sellerData, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Error creating seller profile:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
};

// Register a new user (customer or seller)
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;

    // Check if all required fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password'
      });
    }

    // Validate role
    if (!['customer', 'seller'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "customer" or "seller"'
      });
    }

    // Validate password complexity
    if (!validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    })) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and symbols.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      password,
      role
    });

    await newUser.save();

    // Fetch the saved user to ensure userId is populated
    const savedUser = await User.findById(newUser._id);
    
    // Create customer profile if user is a customer
    if (savedUser.role === 'customer') {
      await createCustomerProfile(savedUser);
    }
    
    // Create seller profile if user is a seller
    if (savedUser.role === 'seller') {
      await createSellerProfile(savedUser);
    }

    // Generate token
    const token = generateToken(savedUser.userId, savedUser.role);

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully`,
      data: {
        user: savedUser,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Register a customer
export const registerCustomer = async (req, res) => {
  req.body.role = 'customer';
  return registerUser(req, res);
};

// Register a seller
export const registerSeller = async (req, res) => {
  req.body.role = 'seller';
  return registerUser(req, res);
};

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email (need to include password for comparison)
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user.userId, user.role);

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Verify token (for other microservices)
export const verifyToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Check if token is blacklisted
    const blacklistedToken = await Blacklist.findOne({ token });
    if (blacklistedToken) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findOne({ userId: decoded.userId });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user,
        decoded
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Logout user (blacklist token)
export const logoutUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token to get expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add token to blacklist
    const blacklistedToken = new Blacklist({
      token,
      expiresAt: new Date(decoded.exp * 1000) // Convert JWT exp to Date
    });

    await blacklistedToken.save();

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Token already expired'
      });
    }

    // Handle duplicate key error (token already blacklisted)
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: 'Already logged out'
      });
    }

    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
