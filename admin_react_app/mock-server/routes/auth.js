const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const logger = require('../utils/logger');
const mockDataStore = require('../data/mockData');
const serverConfig = require('../config/server.config');

const router = express.Router();

// Validation schema for login
const loginSchema = Joi.object({
  user_email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  user_password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  role: Joi.string().valid('super_admin', 'admin').required().messages({
    'any.only': 'Role must be either super_admin or admin',
    'any.required': 'Role is required'
  })
});

// Helper function to find user by email and role
const findUserByEmailAndRole = (email, role) => {
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
  
  // Find user by email in the appropriate store
  for (const [userId, user] of userStore.entries()) {
    if (user.user_email.toLowerCase() === email.toLowerCase()) {
      return user;
    }
  }
  
  return null;
};

// Helper function to generate JWT token
const generateToken = (user) => {
  const payload = {
    user_id: user.user_id,
    role: user.role,
    email: user.user_email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  return jwt.sign(payload, serverConfig.jwt.secret, {
    algorithm: serverConfig.jwt.algorithm
  });
};

// Helper function to format user response
const formatUserResponse = (user, token) => {
  return {
    access_token: token,
    role: user.role,
    user_address: user.user_address || user.address_details?.full_address || 'HQ',
    user_email: user.user_email,
    user_id: user.user_id,
    user_phone_no: user.user_phone,
    username: user.user_name
  };
};

// POST /auth/login - Admin dashboard authentication
router.post('/login', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Log authentication attempt
    logger.auth('Login attempt', {
      email: req.body.user_email,
      role: req.body.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      logger.authError('Login validation failed', {
        email: req.body.user_email,
        role: req.body.role,
        errors: error.details.map(detail => detail.message)
      });
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    
    const { user_email, user_password, role } = value;
    
    // Find user by email and role
    const user = findUserByEmailAndRole(user_email, role);
    
    if (!user) {
      logger.authError('Login failed - user not found', {
        email: user_email,
        role: role,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials or role'
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(user_password, user.password_hash);
    
    if (!isPasswordValid) {
      logger.authError('Login failed - invalid password', {
        email: user_email,
        role: role,
        userId: user.user_id,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      logger.authError('Login failed - inactive user', {
        email: user_email,
        role: role,
        userId: user.user_id,
        status: user.status
      });
      
      return res.status(403).json({
        success: false,
        error: 'Account is not active'
      });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Update last login timestamp
    user.last_login = new Date().toISOString();
    
    // Format response according to API specification
    const response = formatUserResponse(user, token);
    
    // Log successful authentication
    logger.auth('Login successful', {
      userId: user.user_id,
      email: user.user_email,
      role: user.role,
      ip: req.ip,
      responseTime: Date.now() - startTime
    });
    
    // Log security event
    logger.security('User authentication successful', {
      userId: user.user_id,
      email: user.user_email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json(response);
    
  } catch (error) {
    logger.authError('Login error', {
      error: error.message,
      stack: error.stack,
      email: req.body.user_email,
      role: req.body.role,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication'
    });
  }
});

// GET /auth/me - Get current user profile (for token validation)
router.get('/me', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Return user profile information
    const userProfile = {
      success: true,
      user: {
        user_id: user.user_id,
        role: user.role,
        email: user.email,
        username: user.user_name,
        user_address: user.user_data.user_address || user.user_data.address_details?.full_address || 'HQ',
        user_phone_no: user.user_data.user_phone,
        profile: user.user_data.profile,
        last_login: user.user_data.last_login,
        status: user.user_data.status
      }
    };
    
    // Add role-specific information
    if (user.role === 'super_admin') {
      userProfile.user.super_admin_details = user.user_data.super_admin_details;
      userProfile.user.statistics = user.user_data.statistics;
    } else if (user.role === 'admin') {
      userProfile.user.admin_details = user.user_data.admin_details;
      userProfile.user.statistics = user.user_data.statistics;
    }
    
    logger.auth('User profile retrieved', {
      userId: user.user_id,
      role: user.role,
      ip: req.ip
    });
    
    res.status(200).json(userProfile);
    
  } catch (error) {
    logger.authError('Profile retrieval error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.user_id
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /auth/logout - Logout endpoint (for completeness)
router.post('/logout', (req, res) => {
  try {
    // Log logout attempt
    logger.auth('Logout request', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Since we're using stateless JWT, logout is handled client-side
    // This endpoint can be used for logging purposes
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
    
  } catch (error) {
    logger.authError('Logout error', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check for auth service
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'authentication',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      login: 'POST /auth/login',
      profile: 'GET /auth/me',
      logout: 'POST /auth/logout'
    }
  });
});

module.exports = router;