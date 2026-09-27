import jwt from 'jsonwebtoken';

const readRequestToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const tokenPart = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('token='));

  if (!tokenPart) {
    return null;
  }

  return decodeURIComponent(tokenPart.slice('token='.length));
};

export const authenticateToken = (req, res, next) => {
  const token = readRequestToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

export const authenticate = authenticateToken;

export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// Used by Product Service for managing inventory.
export const verifySeller = authorizeRole('seller'); 

// Used by Feedback Service for seller-specific views.
export const requireSeller = authorizeRole('seller'); 

// Used by Feedback Service for posting reviews.
export const requireCustomer = authorizeRole('customer');