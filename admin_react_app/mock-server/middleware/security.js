const Joi = require('joi');
const logger = require('../utils/logger');

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    logger.securityError('Input sanitization error', {
      error: error.message,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });
    
    res.status(400).json({
      success: false,
      error: 'Invalid input data'
    });
  }
};

// Recursive object sanitization
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  return obj;
};

// String sanitization
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  
  // Remove potentially dangerous characters and patterns
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim(); // Remove leading/trailing whitespace
};

// Request validation middleware factory
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      
      if (error) {
        logger.securityError('Request validation failed', {
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          })),
          url: req.originalUrl,
          method: req.method,
          ip: req.ip
        });
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }
      
      // Replace request body with validated and sanitized data
      req.body = value;
      next();
      
    } catch (error) {
      logger.securityError('Request validation error', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
};

// Security headers middleware (additional to Helmet)
const securityHeaders = (req, res, next) => {
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

// IP whitelist middleware (for production)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
      return next(); // Skip in development
    }
    
    if (allowedIPs.length === 0) {
      return next(); // Skip if no whitelist configured
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      logger.securityError('IP access denied', {
        clientIP: clientIP,
        allowedIPs: allowedIPs,
        url: req.originalUrl,
        method: req.method
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied from this IP address'
      });
    }
    
    next();
  };
};

// Request size limit middleware
const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      const maxSizeInMB = parseInt(maxSize.replace('mb', ''));
      
      if (sizeInMB > maxSizeInMB) {
        logger.securityError('Request size limit exceeded', {
          contentLength: contentLength,
          maxSize: maxSize,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip
        });
        
        return res.status(413).json({
          success: false,
          error: 'Request entity too large'
        });
      }
    }
    
    next();
  };
};

// Suspicious activity detection
const detectSuspiciousActivity = (req, res, next) => {
  const suspiciousPatterns = [
    /(\.\.|\/etc\/|\/proc\/|\/sys\/)/i, // Path traversal
    /(union|select|insert|update|delete|drop|create|alter)/i, // SQL injection
    /(<script|javascript:|vbscript:|onload|onerror)/i, // XSS attempts
    /(cmd|exec|system|eval|shell)/i, // Command injection
  ];
  
  const checkString = (str) => {
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };
  
  const checkObject = (obj) => {
    if (typeof obj === 'string') {
      return checkString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(item => checkObject(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkObject(value));
    }
    
    return false;
  };
  
  // Check URL
  if (checkString(req.originalUrl)) {
    logger.securityError('Suspicious URL detected', {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid request'
    });
  }
  
  // Check request body
  if (req.body && checkObject(req.body)) {
    logger.securityError('Suspicious request body detected', {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid request data'
    });
  }
  
  // Check query parameters
  if (req.query && checkObject(req.query)) {
    logger.securityError('Suspicious query parameters detected', {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid query parameters'
    });
  }
  
  next();
};

// Common validation schemas
const commonSchemas = {
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(6).max(128).required(),
  name: Joi.string().min(1).max(100).required(),
  id: Joi.number().integer().positive().required(),
  role: Joi.string().valid('super_admin', 'admin').required(),
  vehicleRegNo: Joi.string().pattern(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/).required(),
  phoneNumber: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  amount: Joi.number().positive().precision(2).required(),
  date: Joi.date().iso().required()
};

module.exports = {
  sanitizeInput,
  validateRequest,
  securityHeaders,
  ipWhitelist,
  requestSizeLimit,
  detectSuspiciousActivity,
  commonSchemas
};