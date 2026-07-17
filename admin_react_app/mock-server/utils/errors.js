/**
 * Custom error classes for different error types
 */

/**
 * Base custom error class
 */
class BaseError extends Error {
  constructor(message, statusCode = 500, errorCode = null, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
      timestamp: this.timestamp,
      isOperational: this.isOperational
    };
  }
}

/**
 * Validation error class
 */
class ValidationError extends BaseError {
  constructor(message, details = null, field = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.field = field;
    this.type = 'validation';
  }
}

/**
 * Authentication error class
 */
class AuthenticationError extends BaseError {
  constructor(message, details = null) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
    this.type = 'authentication';
  }
}

/**
 * Authorization error class
 */
class AuthorizationError extends BaseError {
  constructor(message, requiredRole = null, currentRole = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', {
      requiredRole,
      currentRole
    });
    this.type = 'authorization';
  }
}

/**
 * Resource not found error class
 */
class NotFoundError extends BaseError {
  constructor(resource, identifier = null) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    super(message, 404, 'NOT_FOUND_ERROR', {
      resource,
      identifier
    });
    this.type = 'not_found';
  }
}

/**
 * Conflict error class (for business rule violations)
 */
class ConflictError extends BaseError {
  constructor(message, conflictType = null, details = null) {
    super(message, 409, 'CONFLICT_ERROR', details);
    this.conflictType = conflictType;
    this.type = 'conflict';
  }
}

/**
 * Business logic error class
 */
class BusinessLogicError extends BaseError {
  constructor(message, rule = null, details = null) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', details);
    this.rule = rule;
    this.type = 'business_logic';
  }
}

/**
 * Rate limiting error class
 */
class RateLimitError extends BaseError {
  constructor(message = 'Too many requests', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_ERROR', {
      retryAfter
    });
    this.type = 'rate_limit';
  }
}

/**
 * External service error class
 */
class ExternalServiceError extends BaseError {
  constructor(service, message, originalError = null) {
    super(`External service error: ${service} - ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', {
      service,
      originalError: originalError?.message
    });
    this.service = service;
    this.type = 'external_service';
  }
}

/**
 * Database error class
 */
class DatabaseError extends BaseError {
  constructor(message, operation = null, details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
    this.operation = operation;
    this.type = 'database';
  }
}

/**
 * Configuration error class
 */
class ConfigurationError extends BaseError {
  constructor(message, configKey = null) {
    super(message, 500, 'CONFIGURATION_ERROR', {
      configKey
    });
    this.type = 'configuration';
  }
}

/**
 * Network error class
 */
class NetworkError extends BaseError {
  constructor(message, details = null) {
    super(message, 503, 'NETWORK_ERROR', details);
    this.type = 'network';
  }
}

/**
 * Timeout error class
 */
class TimeoutError extends BaseError {
  constructor(operation, timeout) {
    super(`Operation '${operation}' timed out after ${timeout}ms`, 408, 'TIMEOUT_ERROR', {
      operation,
      timeout
    });
    this.type = 'timeout';
  }
}

/**
 * File system error class
 */
class FileSystemError extends BaseError {
  constructor(message, path = null, operation = null) {
    super(message, 500, 'FILESYSTEM_ERROR', {
      path,
      operation
    });
    this.type = 'filesystem';
  }
}

/**
 * Error factory for creating appropriate error instances
 */
class ErrorFactory {
  /**
   * Create validation error
   */
  static validation(message, details = null, field = null) {
    return new ValidationError(message, details, field);
  }

  /**
   * Create authentication error
   */
  static authentication(message, details = null) {
    return new AuthenticationError(message, details);
  }

  /**
   * Create authorization error
   */
  static authorization(message, requiredRole = null, currentRole = null) {
    return new AuthorizationError(message, requiredRole, currentRole);
  }

  /**
   * Create not found error
   */
  static notFound(resource, identifier = null) {
    return new NotFoundError(resource, identifier);
  }

  /**
   * Create conflict error
   */
  static conflict(message, conflictType = null, details = null) {
    return new ConflictError(message, conflictType, details);
  }

  /**
   * Create business logic error
   */
  static businessLogic(message, rule = null, details = null) {
    return new BusinessLogicError(message, rule, details);
  }

  /**
   * Create rate limit error
   */
  static rateLimit(message = 'Too many requests', retryAfter = null) {
    return new RateLimitError(message, retryAfter);
  }

  /**
   * Create external service error
   */
  static externalService(service, message, originalError = null) {
    return new ExternalServiceError(service, message, originalError);
  }

  /**
   * Create database error
   */
  static database(message, operation = null, details = null) {
    return new DatabaseError(message, operation, details);
  }

  /**
   * Create configuration error
   */
  static configuration(message, configKey = null) {
    return new ConfigurationError(message, configKey);
  }

  /**
   * Create network error
   */
  static network(message, details = null) {
    return new NetworkError(message, details);
  }

  /**
   * Create timeout error
   */
  static timeout(operation, timeout) {
    return new TimeoutError(operation, timeout);
  }

  /**
   * Create file system error
   */
  static filesystem(message, path = null, operation = null) {
    return new FileSystemError(message, path, operation);
  }

  /**
   * Create error from existing error object
   */
  static fromError(error, defaultMessage = 'An error occurred') {
    if (error instanceof BaseError) {
      return error;
    }

    // Handle common Node.js errors
    if (error.code === 'ENOENT') {
      return new FileSystemError('File not found', error.path, 'read');
    }

    if (error.code === 'EACCES') {
      return new FileSystemError('Permission denied', error.path, 'access');
    }

    if (error.code === 'ETIMEDOUT') {
      return new TimeoutError('Network operation', error.timeout || 'unknown');
    }

    if (error.name === 'ValidationError') {
      return new ValidationError(error.message, error.details);
    }

    if (error.name === 'JsonWebTokenError') {
      return new AuthenticationError('Invalid token', { originalError: error.message });
    }

    if (error.name === 'TokenExpiredError') {
      return new AuthenticationError('Token expired', { originalError: error.message });
    }

    // Default to generic error
    return new BaseError(error.message || defaultMessage, 500, 'UNKNOWN_ERROR', {
      originalError: error.name,
      originalMessage: error.message
    });
  }
}

/**
 * Error utilities
 */
class ErrorUtils {
  /**
   * Check if error is operational (expected) or programming error
   */
  static isOperationalError(error) {
    if (error instanceof BaseError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Get error severity level
   */
  static getErrorSeverity(error) {
    if (error instanceof BaseError) {
      if (error.statusCode >= 500) return 'critical';
      if (error.statusCode >= 400) return 'warning';
      return 'info';
    }
    return 'critical';
  }

  /**
   * Sanitize error for client response
   */
  static sanitizeError(error, includeStack = false) {
    const sanitized = {
      success: false,
      error: error.message || 'An error occurred',
      errorCode: error.errorCode || 'UNKNOWN_ERROR',
      timestamp: error.timestamp || new Date().toISOString()
    };

    if (error.details && typeof error.details === 'object') {
      sanitized.details = error.details;
    }

    if (includeStack && error.stack) {
      sanitized.stack = error.stack;
    }

    return sanitized;
  }

  /**
   * Create error context for logging
   */
  static createErrorContext(error, req = null, additionalContext = {}) {
    const context = {
      error: {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        errorCode: error.errorCode,
        type: error.type,
        stack: error.stack
      },
      timestamp: new Date().toISOString(),
      ...additionalContext
    };

    if (req) {
      context.request = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.user_id,
        userRole: req.user?.role,
        correlationId: req.correlationId
      };
    }

    return context;
  }
}

module.exports = {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  ConfigurationError,
  NetworkError,
  TimeoutError,
  FileSystemError,
  ErrorFactory,
  ErrorUtils
};