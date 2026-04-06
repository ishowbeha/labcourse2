const jwt = require('jsonwebtoken');

// Middleware to protect routes - requires authentication
const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, jwtSecret);

    // Check if it's an access token
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type.'
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId
    };

    next();
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
    return res.status(500).json({
      success: false,
      message: 'Authentication error.'
    });
  }
};

// Middleware to check if user has specific role
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const db = req.app.get('db');
      
      console.log('requireRole: Checking roles for userId:', userId);
      console.log('requireRole: Required roles:', roles);
      
      if (!db) {
        console.error('requireRole: Database not available on req.app');
        return res.status(500).json({
          success: false,
          message: 'Database not available'
        });
      }
      
      // Get user roles from database
      const userRoles = db.prepare(`
        SELECT r.name FROM roles r
        INNER JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `).all(userId);

      const roleNames = userRoles.map(r => r.name);
      console.log('requireRole: User roles:', roleNames);
      
      // Check if user has required role
      const hasRole = roles.some(role => roleNames.includes(role));
      console.log('requireRole: Has required role:', hasRole);
      
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions. Required role: ' + roles.join(' or ')
        });
      }

      next();
    } catch (error) {
      console.error('requireRole: Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization error: ' + error.message
      });
    }
  };
};

// Middleware to check if user has specific permission
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const db = req.app.get('db');
      
      // Get user permissions from database
      const userPermissions = db.prepare(`
        SELECT DISTINCT p.name FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ?
      `).all(userId);

      const permissionNames = userPermissions.map(p => p.name);
      
      // Check if user has required permission
      if (!permissionNames.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required: ${permission}`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization error.'
      });
    }
  };
};

// Optional authentication - doesn't fail if no token, but attaches user if valid token
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      const decoded = jwt.verify(token, jwtSecret);
      
      if (decoded.type === 'access') {
        req.user = { userId: decoded.userId };
      }
    }
  } catch (error) {
    // Silently fail - authentication is optional
  }
  
  next();
};

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  optionalAuth
};