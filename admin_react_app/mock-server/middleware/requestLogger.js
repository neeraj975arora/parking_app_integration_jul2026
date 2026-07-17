const logger = require('../utils/logger');
const crypto = require('crypto');

// Configuration for payload logging
const ENABLE_PAYLOAD_LOGGING = process.env.ENABLE_PAYLOAD_LOGGING === 'true';
const MAX_PAYLOAD_SIZE = parseInt(process.env.MAX_PAYLOAD_SIZE) || 1024 * 1024; // 1MB default
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'key', 'auth'];

// Request statistics tracking
const requestStats = {
  totalRequests: 0,
  requestsByMethod: {},
  requestsByStatus: {},
  averageResponseTime: 0,
  slowRequests: [],
  errorRequests: []
};

// Utility to sanitize sensitive data
const sanitizeData = (data, depth = 0) => {
  if (depth > 3 || !data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Utility to sanitize headers
const sanitizeHeaders = (headers) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Utility to truncate large payloads
const truncatePayload = (payload, maxSize = MAX_PAYLOAD_SIZE) => {
  if (!payload) return payload;
  
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (payloadStr.length > maxSize) {
    return {
      truncated: true,
      originalSize: payloadStr.length,
      data: payloadStr.substring(0, maxSize) + '...[TRUNCATED]'
    };
  }
  return payload;
};

// Generate unique request ID
const generateRequestId = () => {
  return crypto.randomBytes(8).toString('hex');
};

// Update request statistics
const updateRequestStats = (method, statusCode, responseTime) => {
  requestStats.totalRequests++;
  
  // Track by method
  requestStats.requestsByMethod[method] = (requestStats.requestsByMethod[method] || 0) + 1;
  
  // Track by status code
  const statusGroup = `${Math.floor(statusCode / 100)}xx`;
  requestStats.requestsByStatus[statusGroup] = (requestStats.requestsByStatus[statusGroup] || 0) + 1;
  
  // Update average response time
  requestStats.averageResponseTime = 
    (requestStats.averageResponseTime * (requestStats.totalRequests - 1) + responseTime) / 
    requestStats.totalRequests;
  
  // Track slow requests (>1000ms)
  if (responseTime > 1000) {
    requestStats.slowRequests.push({
      timestamp: new Date().toISOString(),
      responseTime,
      method,
      statusCode
    });
    
    // Keep only last 100 slow requests
    if (requestStats.slowRequests.length > 100) {
      requestStats.slowRequests = requestStats.slowRequests.slice(-100);
    }
  }
  
  // Track error requests (4xx, 5xx)
  if (statusCode >= 400) {
    requestStats.errorRequests.push({
      timestamp: new Date().toISOString(),
      statusCode,
      method
    });
    
    // Keep only last 100 error requests
    if (requestStats.errorRequests.length > 100) {
      requestStats.errorRequests = requestStats.errorRequests.slice(-100);
    }
  }
};

// Main request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Set correlation ID in logger context
  logger.setCorrelationId(requestId);
  
  // Add request ID to request object for downstream use
  req.requestId = requestId;
  
  // Capture request details
  const requestDetails = {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    query: req.query,
    headers: sanitizeHeaders(req.headers),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString()
  };

  // Add payload logging if enabled
  if (ENABLE_PAYLOAD_LOGGING && req.body) {
    requestDetails.body = truncatePayload(sanitizeData(req.body));
  }

  // Log incoming request
  logger.api('Incoming request', requestDetails);

  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  let responseBody = null;
  let responseSent = false;

  // Override res.send to capture response body
  res.send = function(body) {
    if (!responseSent) {
      responseBody = body;
      responseSent = true;
      logResponse();
    }
    return originalSend.call(this, body);
  };

  // Override res.json to capture JSON response
  res.json = function(obj) {
    if (!responseSent) {
      responseBody = obj;
      responseSent = true;
      logResponse();
    }
    return originalJson.call(this, obj);
  };

  // Override res.end to capture any other responses
  res.end = function(chunk, encoding) {
    if (!responseSent) {
      responseBody = chunk;
      responseSent = true;
      logResponse();
    }
    return originalEnd.call(this, chunk, encoding);
  };

  // Function to log response details
  const logResponse = () => {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const responseDetails = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      responseTime,
      contentType: res.get('Content-Type'),
      contentLength: res.get('Content-Length'),
      headers: sanitizeHeaders(res.getHeaders()),
      timestamp: new Date().toISOString()
    };

    // Add response body if payload logging is enabled
    if (ENABLE_PAYLOAD_LOGGING && responseBody) {
      responseDetails.body = truncatePayload(sanitizeData(responseBody));
    }

    // Determine log level based on status code
    let logLevel = 'api';
    let message = 'Request completed';
    
    if (res.statusCode >= 500) {
      logLevel = 'apiError';
      message = 'Request failed with server error';
    } else if (res.statusCode >= 400) {
      logLevel = 'apiError';
      message = 'Request failed with client error';
    } else if (responseTime > 1000) {
      message = 'Slow request completed';
    }

    // Log response
    logger[logLevel](message, responseDetails);

    // Log performance metrics
    logger.performance('Request performance', {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTime,
      category: 'request-performance'
    });

    // Update statistics
    updateRequestStats(req.method, res.statusCode, responseTime);

    // Clear correlation context
    logger.clearCorrelationId();
  };

  // Handle cases where response is not sent through our overridden methods
  res.on('finish', () => {
    if (!responseSent) {
      responseSent = true;
      logResponse();
    }
  });

  next();
};

// Middleware to add request statistics endpoint
const requestStatsMiddleware = (req, res, next) => {
  if (req.path === '/metrics/requests') {
    return res.json({
      ...requestStats,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  
  logger.errorWithContext(err, req, {
    requestId,
    category: 'request-error'
  });

  next(err);
};

// Export middleware functions
module.exports = {
  requestLogger,
  requestStatsMiddleware,
  errorLogger,
  getRequestStats: () => ({ ...requestStats })
};