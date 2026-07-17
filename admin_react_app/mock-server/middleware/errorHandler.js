const logger = require('../utils/logger');
const { BaseError, ErrorFactory, ErrorUtils } = require('../utils/errors');

/**
 * Enhanced centralized error handling middleware
 */
class ErrorHandler {
  /**
   * Main error handling middleware
   */
  static handle(err, req, res, next) {
    try {
      // Convert error to standardized format
      const standardizedError = ErrorFactory.fromError(err);
      
      // Create error context for logging
      const errorContext = ErrorUtils.createErrorContext(standardizedError, req, {
        correlationId: req.correlationId || ErrorHandler.generateCorrelationId(),
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        requestBody: ErrorHandler.sanitizeRequestBody(req.body),
        requestParams: req.params,
        requestQuery: req.query
      });

      // Log error based on severity
      ErrorHandler.logError(standardizedError, errorContext);

      // Send error response
      ErrorHandler.sendErrorResponse(standardizedError, req, res);

      // Notify error monitoring services if needed
      ErrorHandler.notifyErrorMonitoring(standardizedError, errorContext);

    } catch (handlingError) {
      // Fallback error handling
      logger.error('Error in error handler:', {
        originalError: err.message,
        handlingError: handlingError.message,
        stack: handlingError.stack,
        url: req.originalUrl,
        method: req.method
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        errorCode: 'HANDLER_ERROR'
      });
    }
  }

  /**
   * Log error based on severity and type
   */
  static logError(error, context) {
    const severity = ErrorUtils.getErrorSeverity(error);
    const logMethod = ErrorHandler.getLogMethod(severity);

    logMethod('Error occurred:', {
      ...context,
      severity,
      isOperational: ErrorUtils.isOperationalError(error)
    });

    // Additional logging for critical errors
    if (severity === 'critical') {
      logger.error('CRITICAL ERROR DETAILS:', {
        error: error.toJSON(),
        context: context,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send appropriate error response to client
   */
  static sendErrorResponse(error, req, res) {
    const statusCode = error.statusCode || 500;
    const includeStack = process.env.NODE_ENV === 'development' && statusCode >= 500;
    
    // Sanitize error for client
    const sanitizedError = ErrorUtils.sanitizeError(error, includeStack);
    
    // Add correlation ID for tracking
    sanitizedError.correlationId = req.correlationId || ErrorHandler.generateCorrelationId();
    
    // Add helpful information based on error type
    ErrorHandler.addErrorTypeSpecificInfo(sanitizedError, error, req);
    
    res.status(statusCode).json(sanitizedError);
  }

  /**
   * Add error type specific information to response
   */
  static addErrorTypeSpecificInfo(response, error, req) {
    switch (error.type) {
      case 'validation':
        response.help = 'Please check your input data and try again';
        if (error.field) {
          response.field = error.field;
        }
        break;
        
      case 'authentication':
        response.help = 'Please check your credentials and try again';
        response.loginUrl = '/auth/login';
        break;
        
      case 'authorization':
        response.help = 'You do not have permission to perform this action';
        if (error.details?.requiredRole) {
          response.requiredRole = error.details.requiredRole;
        }
        break;
        
      case 'not_found':
        response.help = 'The requested resource could not be found';
        break;
        
      case 'conflict':
        response.help = 'The request conflicts with the current state of the resource';
        break;
        
      case 'rate_limit':
        response.help = 'You have exceeded the rate limit. Please try again later';
        if (error.details?.retryAfter) {
          response.retryAfter = error.details.retryAfter;
        }
        break;
        
      case 'external_service':
        response.help = 'An external service is currently unavailable. Please try again later';
        break;
        
      default:
        if (error.statusCode >= 500) {
          response.help = 'An internal server error occurred. Please try again later';
        }
    }
  }

  /**
   * Get appropriate log method based on severity
   */
  static getLogMethod(severity) {
    switch (severity) {
      case 'critical':
        return logger.error.bind(logger);
      case 'warning':
        return logger.warn.bind(logger);
      case 'info':
        return logger.info.bind(logger);
      default:
        return logger.error.bind(logger);
    }
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   */
  static sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password', 'user_password', 'new_password', 'current_password',
      'token', 'access_token', 'refresh_token', 'api_key',
      'credit_card', 'card_number', 'cvv', 'ssn'
    ];

    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Generate correlation ID for error tracking
   */
  static generateCorrelationId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notify external error monitoring services
   */
  static notifyErrorMonitoring(error, context) {
    // In a real application, this would integrate with services like:
    // - Sentry
    // - Rollbar
    // - Bugsnag
    // - New Relic
    
    if (process.env.NODE_ENV === 'production' && ErrorUtils.getErrorSeverity(error) === 'critical') {
      logger.error('CRITICAL ERROR - External monitoring notification would be sent:', {
        error: error.toJSON(),
        context: context
      });
    }
  }

  /**
   * Handle unhandled promise rejections
   */
  static handleUnhandledRejection(reason, promise) {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });

    // In production, you might want to gracefully shutdown
    if (process.env.NODE_ENV === 'production') {
      logger.error('Shutting down due to unhandled promise rejection');
      process.exit(1);
    }
  }

  /**
   * Handle uncaught exceptions
   */
  static handleUncaughtException(error) {
    logger.error('Uncaught Exception:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Always exit on uncaught exceptions
    logger.error('Shutting down due to uncaught exception');
    process.exit(1);
  }

  /**
   * Create async error wrapper for route handlers
   */
  static asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Create error boundary for specific operations
   */
  static createErrorBoundary(operation, fallbackValue = null) {
    return async (...args) => {
      try {
        return await operation(...args);
      } catch (error) {
        logger.error(`Error in ${operation.name || 'anonymous operation'}:`, {
          error: error.message,
          stack: error.stack,
          args: args.length
        });
        return fallbackValue;
      }
    };
  }

  /**
   * Validate error handling configuration
   */
  static validateConfiguration() {
    const requiredEnvVars = ['NODE_ENV'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    logger.info('Error handling configuration validated successfully');
  }
}

// Set up global error handlers
process.on('unhandledRejection', ErrorHandler.handleUnhandledRejection);
process.on('uncaughtException', ErrorHandler.handleUncaughtException);

// Validate configuration on module load
try {
  ErrorHandler.validateConfiguration();
} catch (error) {
  console.error('Error handler configuration validation failed:', error.message);
  process.exit(1);
}

module.exports = ErrorHandler.handle;