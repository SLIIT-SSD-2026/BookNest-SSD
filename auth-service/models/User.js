import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      if (this.role === 'seller') {
        const randomNumber = Math.floor(Math.random() * 900000) + 100000;
        return 'SELL-' + randomNumber;
      } else {
        const randomNumber = Math.floor(Math.random() * 900000) + 100000;
        return 'CUST-' + randomNumber;
      }
    }
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['customer', 'seller'],
    default: 'customer'
  },
  createDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate unique userId for customers if collision occurs
userSchema.pre('save', async function() {
  if (this.isNew && this.role === 'customer') {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      try {
        // Check if userId already exists
        const existingUser = await mongoose.model('User').findOne({ userId: this.userId });
        if (!existingUser) {
          break;
        }
        
        // Generate a new userId
        const randomNumber = Math.floor(Math.random() * 900000) + 100000;
        this.userId = 'CUST-' + randomNumber;
        attempts++;
      } catch (error) {
        break;
      }
    }
  }
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const hashedPassword = await bcrypt.hash(this.password, 12);
  this.password = hashedPassword;
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;