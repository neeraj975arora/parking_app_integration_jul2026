const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const mockDataStore = require('../data/mockData');
const serverConfig = require('../config/server.config');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      logger.authError('Authentication failed - no token provided', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
    }
    
    // Verify JWT token
    jwt.verify(token, serverConfig.jwt.secret, (err, decoded) => {
      if (err) {
        logger.authError('Authentication failed - invalid token', {
          error: err.message,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip
        });
        
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Token has expired'
          });
        }
        
        if (err.name === 'JsonWebTokenError') {
          return res.status(401).json({
            success: false,
            error: 'Invalid token'
          });
        }
        
        return res.status(401).json({
          success: false,
          error: 'Token verification failed'
        });
      }
      
      // Verify user still exists and is active
      const user = getUserById(decoded.user_id, decoded.role);
      
      if (!user) {
        logger.authError('Authentication failed - user not found', {
          userId: decoded.user_id,
          role: decoded.role,
          url: req.originalUrl,
          method: req.method
        });
        
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }
      
      if (user.status !== 'active') {
        logger.authError('Authentication failed - inactive user', {
          userId: decoded.user_id,
          role: decoded.role,
          status: user.status,
          url: req.originalUrl,
          method: req.method
        });
        
        return res.status(403).json({
          success: false,
          error: 'Account is not active'
        });
      }
      
      // Inject user context into request
      req.user = {
        user_id: decoded.user_id,
        role: decoded.role,
        email: decoded.email,
        user_name: user.user_name,
        user_data: user
      };
      
      // Log successful authentication
      logger.auth('Token authentication successful', {
        userId: decoded.user_id,
        role: decoded.role,
        url: req.originalUrl,
        method: req.method
      });
      
      next();
    });
    
  } catch (error) {
    logger.authError('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal authentication error'
    });
  }
};

// Role-based Access Control Middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        logger.authError('Authorization failed - no user context', {
          url: req.originalUrl,
          method: req.method,
          ip: req.ip
        });
        
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const userRole = req.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        logger.authError('Authorization failed - insufficient permissions', {
          userId: req.user.user_id,
          userRole: userRole,
          requiredRoles: allowedRoles,
          url: req.originalUrl,
          method: req.method
        });
        
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions for this operation'
        });
      }
      
      // Log successful authorization
      logger.auth('Role authorization successful', {
        userId: req.user.user_id,
        userRole: userRole,
        requiredRoles: allowedRoles,
        url: req.originalUrl,
        method: req.method
      });
      
      next();
      
    } catch (error) {
      logger.authError('Authorization middleware error', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal authorization error'
      });
    }
  };
};

// Super Admin Only Middleware
const requireSuperAdmin = requireRole(['super_admin']);

// Admin or Super Admin Middleware
const requireAdmin = requireRole(['admin', 'super_admin']);

// Helper function to get user by ID and role
const getUserById = (userId, role) => {
  let userStore;
  
  switch (role) {
    case 'super_admin':
      userStore = mockDataStore.superAdmins;
      break;
    case 'admin':
      userStore = mockDataStore.admins;
      break;
    default:
      return null;
  }
  
  return userStore.get(userId);
};

// Middleware to inject user context for optional authentication
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return next(); // Continue without authentication
  }
  
  try {
    const decoded = jwt.verify(token, serverConfig.jwt.secret);
    const user = getUserById(decoded.user_id, decoded.role);
    
    if (user && user.status === 'active') {
      req.user = {
        user_id: decoded.user_id,
        role: decoded.role,
        email: decoded.email,
        user_name: user.user_name,
        user_data: user
      };
    }
  } catch (error) {
    // Ignore token errors for optional auth
    logger.authDebug('Optional auth token error', {
      error: error.message,
      url: req.originalUrl
    });
  }
  
  next();
};

// Middleware to check if user has access to specific admin's data
const requireAdminAccess = (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.user_id);
    const currentUser = req.user;
    
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Super admins can access any admin's data
    if (currentUser.role === 'super_admin') {
      return next();
    }
    
    // Admins can only access their own data
    if (currentUser.role === 'admin' && currentUser.user_id === targetUserId) {
      return next();
    }
    
    logger.authError('Admin access denied', {
      currentUserId: currentUser.user_id,
      currentUserRole: currentUser.role,
      targetUserId: targetUserId,
      url: req.originalUrl,
      method: req.method
    });
    
    return res.status(403).json({
      success: false,
      error: 'Access denied - you can only access your own data'
    });
    
  } catch (error) {
    logger.authError('Admin access check error', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal authorization error'
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireAdminAccess,
  optionalAuth,
  getUserById
};