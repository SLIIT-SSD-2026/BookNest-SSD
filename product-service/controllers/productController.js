const mongoose = require('mongoose');
const validator = require('validator');
const Product = require('../models/Product');
const {
  getRelevantFeedbackForProduct,
  getFeedbackHealth
} = require('../services/feedbackService');
const {
  getSellerHealth,
  getSellerByUserId
} = require('../services/sellerService');

// Helper to sanitize text fields by escaping HTML tags (<, >, &, ", ')
const sanitizeText = (str) => {
  if (typeof str !== 'string') return str;
  return validator.escape(str.trim());
};

// Helper to validate ISBN format (e.g., ^[0-9X-]{10,17}$)
const validateIsbn = (isbn) => {
  if (!isbn) return true;
  return /^[0-9xX-]{10,17}$/.test(String(isbn).trim());
};

// Helper to sanitize product body payload
const sanitizeProductPayload = (payload) => {
  const data = { ...payload };

  const textFields = ['title', 'author', 'description', 'category', 'publisher', 'language'];
  textFields.forEach((field) => {
    if (data[field] && typeof data[field] === 'string') {
      data[field] = sanitizeText(data[field]);
    }
  });

  if (data.isbn && typeof data.isbn === 'string') {
    data.isbn = data.isbn.trim();
  }

  if (data.coverImage && typeof data.coverImage === 'string') {
    data.coverImage = data.coverImage.trim();
  }

  return data;
};

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    if (req.body.isbn && !validateIsbn(req.body.isbn)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ISBN format. Must be 10 to 17 alphanumeric characters or hyphens.'
      });
    }

    const sanitizedBody = sanitizeProductPayload(req.body);
    const product = new Product(sanitizedBody);
    await product.save();
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort } = req.query;
    let query = { isActive: true };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Search by text
    if (search) {
      query.$text = { $search: search };
    }

    let productsQuery = Product.find(query);

    // Sorting
    if (sort) {
      const sortOrder = sort.startsWith('-') ? -1 : 1;
      const sortField = sort.replace('-', '');
      productsQuery = productsQuery.sort({ [sortField]: sortOrder });
    }

    const products = await productsQuery.exec();

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get product by productId (user-friendly ID)
exports.getProductByProductId = async (req, res) => {
  try {
    const product = await Product.findOne({ productId: req.params.productId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get products by seller
exports.getProductsBySeller = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.params.sellerId });
    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    // Find the product first to check ownership
    const existingProduct = await Product.findById(req.params.id);
    
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user is authorized to update this product
    // req.user is set by authenticateToken middleware
    if (req.user && req.user.role !== 'admin') {
      // Sellers can only update their own products
      if (existingProduct.sellerId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own products.'
        });
      }
    }

    if (req.body.isbn && !validateIsbn(req.body.isbn)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ISBN format. Must be 10 to 17 alphanumeric characters or hyphens.'
      });
    }

    const sanitizedBody = sanitizeProductPayload(req.body);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      sanitizedBody,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete product (permanent delete)
exports.deleteProduct = async (req, res) => {
  try {
    // Find the product first to check ownership
    const existingProduct = await Product.findById(req.params.id);
    
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user is authorized to delete this product
    // req.user is set by authenticateToken middleware
    if (req.user && req.user.role !== 'admin') {
      // Sellers can only delete their own products
      if (existingProduct.sellerId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete your own products.'
        });
      }
    }

    // Permanently delete the product from the database
    await Product.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Sync product rating summary from feedback service
exports.syncProductRatings = async (req, res) => {
  try {
    const { productId, averageRating, ratingsCount } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId is required'
      });
    }

    const normalizedAverage = Number(averageRating || 0);
    const normalizedCount = Number(ratingsCount || 0);

    if (Number.isNaN(normalizedAverage) || Number.isNaN(normalizedCount)) {
      return res.status(400).json({
        success: false,
        message: 'averageRating and ratingsCount must be numeric values'
      });
    }

    // Orders / feedback may reference either business productId (PROD-…) or MongoDB _id
    const ratingPatch = {
      'ratings.average': Math.max(0, Math.min(5, normalizedAverage)),
      'ratings.count': Math.max(0, normalizedCount)
    };

    let product = await Product.findOneAndUpdate({ productId }, ratingPatch, { new: true });

    if (!product && mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findOneAndUpdate({ _id: productId }, ratingPatch, { new: true });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product ratings synced successfully',
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get relevant feedback for a product by forwarding caller token to feedback-service.
exports.getProductFeedback = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const feedbackResponse = await getRelevantFeedbackForProduct(productId, req.headers.authorization || '');

    return res.status(200).json({
      success: true,
      message: 'Relevant feedback retrieved successfully',
      source: feedbackResponse.source,
      productId,
      data: feedbackResponse.data || {}
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch product feedback from feedback-service'
    });
  }
};

// Check feedback-service connectivity from product-service.
exports.getFeedbackServiceHealth = async (_req, res) => {
  try {
    const health = await getFeedbackHealth();
    return res.status(200).json({
      success: true,
      message: 'Feedback service health fetched successfully',
      data: health
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch feedback service health'
    });
  }
};

// Check seller-service connectivity from product-service.
exports.getSellerServiceHealth = async (_req, res) => {
  try {
    const health = await getSellerHealth();
    return res.status(200).json({
      success: true,
      message: 'Seller service health fetched successfully',
      data: health
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch seller service health'
    });
  }
};

// Get seller profile for a product by reading sellerId from product.
exports.getProductSellerProfile = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.sellerId) {
      return res.status(400).json({
        success: false,
        message: 'Product does not have sellerId'
      });
    }

    const seller = await getSellerByUserId(product.sellerId);

    return res.status(200).json({
      success: true,
      message: 'Seller profile retrieved successfully',
      productId,
      sellerId: product.sellerId,
      data: { seller }
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch seller profile from seller-service'
    });
  }
};
