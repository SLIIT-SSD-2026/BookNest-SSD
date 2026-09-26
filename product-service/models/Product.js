const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  isbn: {
    type: String,
    unique: true,
    sparse: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[0-9xX-]{10,17}$/.test(v);
      },
      message: 'Invalid ISBN format. Must be 10-17 alphanumeric characters or hyphens.'
    }
  },
  publisher: {
    type: String,
    trim: true
  },
  publicationYear: {
    type: Number
  },
  language: {
    type: String,
    default: 'English'
  },
  pages: {
    type: Number,
    min: 1
  },
  coverImage: {
    type: String
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  sellerId: {
    type: String,
    required: true
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for search
productSchema.index({ title: 'text', author: 'text', description: 'text' });

// Pre-save hook to auto-generate productId if not provided
productSchema.pre('save', async function(next) {
  if (!this.productId) {
    // Generate a user-friendly product ID: PROD-XXXXXXXX
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.productId = `PROD-${timestamp}-${randomCode}`;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
