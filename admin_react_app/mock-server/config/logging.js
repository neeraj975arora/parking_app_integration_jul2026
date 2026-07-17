const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for request correlation and structured logging
const correlationFormat = winston.format((info) => {
  // Add correlation ID if available in context
  if (info.correlationId) {
    info.requestId = info.correlationId;
  }
  
  // Add service metadata
  info.service = info.service || 'parking-mock-server';
  info.environment = process.env.NODE_ENV || 'development';
  
  return info;
});

// Enhanced JSON format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  correlationFormat(),
  winston.format.json()
);

// Enhanced console format with colors and request IDs
const enhancedConsoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, requestId, category, duration, ...meta }) => {
    let logLine = `${timestamp} [${level}]`;
    
    // Add request ID if available
    if (requestId) {
      logLine += ` [${requestId}]`;
    }
    
    // Add category if available
    if (category) {
      logLine += ` [${category}]`;
    }
    
    logLine += `: ${message}`;
    
    // Add duration for performance logs
    if (duration !== undefined) {
      logLine += ` (${duration}ms)`;
    }
    
    // Add additional metadata
    const metaKeys = Object.keys(meta).filter(key => 
      !['service', 'environment', 'correlationId'].includes(key)
    );
    
    if (metaKeys.length > 0) {
      const cleanMeta = {};
      metaKeys.forEach(key => {
        cleanMeta[key] = meta[key];
      });
      logLine += ` ${JSON.stringify(cleanMeta)}`;
    }
    
    return logLine;
  })
);

// Environment-based log level configuration
const getLogLevel = () => {
  const envLevel = process.env.LOG_LEVEL;
  if (envLevel) {
    return envLevel.toLowerCase();
  }
  
  switch (process.env.NODE_ENV) {
    case 'production':
      return 'warn';
    case 'test':
      return 'error';
    case 'development':
    default:
      return 'debug';
  }
};

// Console transport with environment-based configuration
const consoleTransport = new winston.transports.Console({
  format: enhancedConsoleFormat,
  level: getLogLevel(),
  handleExceptions: true,
  handleRejections: true
});

// Application logs with daily rotation
const applicationTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '50m',
  maxFiles: '30d',
  level: 'info',
  format: structuredFormat,
  handleExceptions: true,
  handleRejections: true,
  auditFile: path.join(logsDir, '.application-audit.json')
});

// Error logs with extended retention
const errorTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '90d', // Keep error logs longer
  level: 'error',
  format: structuredFormat,
  handleExceptions: true,
  handleRejections: true,
  auditFile: path.join(logsDir, '.error-audit.json')
});

// API trace logs for request/response tracking
const apiTraceTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'api-trace-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '100m',
  maxFiles: '14d',
  level: 'http',
  format: structuredFormat,
  auditFile: path.join(logsDir, '.api-trace-audit.json')
});

// Performance logs for monitoring
const performanceTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'performance-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '50m',
  maxFiles: '14d',
  level: 'info',
  format: structuredFormat,
  auditFile: path.join(logsDir, '.performance-audit.json')
});

// Security logs for authentication and authorization events
const securityTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'security-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '90d', // Keep security logs longer
  level: 'info',
  format: structuredFormat,
  auditFile: path.join(logsDir, '.security-audit.json')
});

// Business logic logs for audit trails
const businessTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'business-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '30m',
  maxFiles: '60d',
  level: 'info',
  format: structuredFormat,
  auditFile: path.join(logsDir, '.business-audit.json')
});

const loggingConfig = {
  level: getLogLevel(),
  format: structuredFormat,
  defaultMeta: { 
    service: 'parking-mock-server',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  },
  transports: [
    consoleTransport,
    applicationTransport,
    errorTransport,
    apiTraceTransport,
    performanceTransport,
    securityTransport,
    businessTransport
  ],
  exitOnError: false, // Don't exit on handled exceptions
  
  // Exception handling
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      format: structuredFormat
    })
  ],
  
  // Rejection handling
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      format: structuredFormat
    })
  ]
};

module.exports = loggingConfig;