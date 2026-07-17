const winston = require('winston');
const loggingConfig = require('../config/logging');
const crypto = require('crypto');

// Create logger instance
const logger = winston.createLogger(loggingConfig);

// Request correlation context storage
const correlationContext = new Map();

// Generate correlation ID
const generateCorrelationId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Set correlation ID for current request
logger.setCorrelationId = (correlationId) => {
  const id = correlationId || generateCorrelationId();
  correlationContext.set('current', id);
  return id;
};

// Get current correlation ID
logger.getCorrelationId = () => {
  return correlationContext.get('current');
};

// Clear correlation context
logger.clearCorrelationId = () => {
  correlationContext.delete('current');
};

// Enhanced logging methods with correlation ID injection
const createLogMethod = (level, category) => {
  return (message, meta = {}) => {
    const correlationId = logger.getCorrelationId();
    const logData = {
      category,
      ...meta,
      ...(correlationId && { correlationId })
    };
    
    logger[level](message, logData);
  };
};

// Authentication and authorization logs
logger.auth = createLogMethod('info', 'auth');
logger.authError = createLogMethod('error', 'auth');
logger.authDebug = createLogMethod('debug', 'auth');

// API request/response logs
logger.api = createLogMethod('http', 'api');
logger.apiError = createLogMethod('error', 'api');
logger.apiDebug = createLogMethod('debug', 'api');

// Business logic logs
logger.business = createLogMethod('info', 'business');
logger.businessError = createLogMethod('error', 'business');
logger.businessDebug = createLogMethod('debug', 'business');

// Data access and manipulation logs
logger.data = createLogMethod('debug', 'data');
logger.dataError = createLogMethod('error', 'data');
logger.dataInfo = createLogMethod('info', 'data');

// Performance monitoring logs
logger.performance = (message, meta = {}) => {
  const correlationId = logger.getCorrelationId();
  const logData = {
    category: 'performance',
    ...meta,
    ...(correlationId && { correlationId })
  };
  
  // Use info level for performance logs
  logger.info(message, logData);
};

// Security event logs
logger.security = createLogMethod('warn', 'security');
logger.securityError = createLogMethod('error', 'security');
logger.securityInfo = createLogMethod('info', 'security');

// System and infrastructure logs
logger.system = createLogMethod('info', 'system');
logger.systemError = createLogMethod('error', 'system');
logger.systemDebug = createLogMethod('debug', 'system');

// Request timing utility
logger.startTimer = (label) => {
  const correlationId = logger.getCorrelationId();
  const startTime = Date.now();
  
  return {
    end: (message, meta = {}) => {
      const duration = Date.now() - startTime;
      logger.performance(message || `${label} completed`, {
        duration,
        label,
        ...meta,
        ...(correlationId && { correlationId })
      });
      return duration;
    }
  };
};

// Request context logging
logger.request = (req, message, meta = {}) => {
  const correlationId = logger.getCorrelationId();
  logger.api(message, {
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    ...meta,
    ...(correlationId && { correlationId })
  });
};

// Response context logging
logger.response = (req, res, message, meta = {}) => {
  const correlationId = logger.getCorrelationId();
  logger.api(message, {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    contentLength: res.get('Content-Length'),
    ...meta,
    ...(correlationId && { correlationId })
  });
};

// Error logging with context
logger.errorWithContext = (error, req, meta = {}) => {
  const correlationId = logger.getCorrelationId();
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    request: req ? {
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    } : undefined,
    ...meta,
    ...(correlationId && { correlationId })
  });
};

// Structured data logging
logger.logData = (level, message, data, meta = {}) => {
  const correlationId = logger.getCorrelationId();
  logger[level](message, {
    data,
    ...meta,
    ...(correlationId && { correlationId })
  });
};

// Audit trail logging
logger.audit = (action, resource, user, meta = {}) => {
  const correlationId = logger.getCorrelationId();
  logger.business(`Audit: ${action} on ${resource}`, {
    audit: {
      action,
      resource,
      user: user ? {
        id: user.user_id,
        email: user.user_email,
        role: user.role
      } : null,
      timestamp: new Date().toISOString()
    },
    ...meta,
    ...(correlationId && { correlationId })
  });
};

// Health check logging
logger.health = (component, status, meta = {}) => {
  const level = status === 'healthy' ? 'info' : 'warn';
  logger.system(`Health check: ${component} is ${status}`, {
    health: {
      component,
      status,
      timestamp: new Date().toISOString()
    },
    ...meta
  });
};

module.exports = logger;