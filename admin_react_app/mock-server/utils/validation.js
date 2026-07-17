const Joi = require('joi');
const { validationOptions, customMessages } = require('../schemas/base');
const logger = require('./logger');

/**
 * Validation utility functions
 */
class ValidationUtils {
  /**
   * Validate data against a Joi schema
   * @param {Object} data - Data to validate
   * @param {Object} schema - Joi schema
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  static validate(data, schema, options = {}) {
    const validationOpts = {
      ...validationOptions,
      ...options,
      messages: customMessages
    };

    const { error, value } = schema.validate(data, validationOpts);

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
        type: detail.type
      }));

      logger.validation('Validation failed', {
        errors: validationErrors,
        originalData: data
      });

      return {
        isValid: false,
        errors: validationErrors,
        value: null
      };
    }

    return {
      isValid: true,
      errors: null,
      value
    };
  }

  /**
   * Create validation middleware for Express routes
   * @param {Object} schema - Joi schema
   * @param {string} source - Source of data ('body', 'params', 'query', 'headers')
   * @param {Object} options - Validation options
   * @returns {Function} - Express middleware function
   */
  static createValidationMiddleware(schema, source = 'body', options = {}) {
    return (req, res, next) => {
      try {
        const dataToValidate = req[source];
        
        if (!dataToValidate && source !== 'query') {
          logger.validationError('No data to validate', {
            source,
            url: req.originalUrl,
            method: req.method
          });
          
          return res.status(400).json({
            success: false,
            error: 'Request data is required',
            details: {
              source,
              message: `${source} data is missing`
            }
          });
        }

        const validation = ValidationUtils.validate(dataToValidate || {}, schema, options);

        if (!validation.isValid) {
          logger.validationError('Request validation failed', {
            source,
            errors: validation.errors,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip
          });

          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: {
              source,
              errors: validation.errors
            }
          });
        }

        // Replace the original data with validated and sanitized data
        req[source] = validation.value;

        logger.validation('Request validation successful', {
          source,
          url: req.originalUrl,
          method: req.method
        });

        next();

      } catch (error) {
        logger.validationError('Validation middleware error', {
          error: error.message,
          stack: error.stack,
          source,
          url: req.originalUrl,
          method: req.method
        });

        res.status(500).json({
          success: false,
          error: 'Internal validation error'
        });
      }
    };
  }

  /**
   * Validate request body
   * @param {Object} schema - Joi schema
   * @param {Object} options - Validation options
   * @returns {Function} - Express middleware function
   */
  static validateBody(schema, options = {}) {
    return ValidationUtils.createValidationMiddleware(schema, 'body', options);
  }

  /**
   * Validate request parameters
   * @param {Object} schema - Joi schema
   * @param {Object} options - Validation options
   * @returns {Function} - Express middleware function
   */
  static validateParams(schema, options = {}) {
    return ValidationUtils.createValidationMiddleware(schema, 'params', options);
  }

  /**
   * Validate query parameters
   * @param {Object} schema - Joi schema
   * @param {Object} options - Validation options
   * @returns {Function} - Express middleware function
   */
  static validateQuery(schema, options = {}) {
    return ValidationUtils.createValidationMiddleware(schema, 'query', options);
  }

  /**
   * Validate request headers
   * @param {Object} schema - Joi schema
   * @param {Object} options - Validation options
   * @returns {Function} - Express middleware function
   */
  static validateHeaders(schema, options = {}) {
    return ValidationUtils.createValidationMiddleware(schema, 'headers', options);
  }

  /**
   * Combine multiple validation middlewares
   * @param {Object} validations - Object with validation schemas for different sources
   * @returns {Array} - Array of middleware functions
   */
  static validateRequest(validations) {
    const middlewares = [];

    if (validations.params) {
      middlewares.push(ValidationUtils.validateParams(validations.params));
    }

    if (validations.query) {
      middlewares.push(ValidationUtils.validateQuery(validations.query));
    }

    if (validations.body) {
      middlewares.push(ValidationUtils.validateBody(validations.body));
    }

    if (validations.headers) {
      middlewares.push(ValidationUtils.validateHeaders(validations.headers));
    }

    return middlewares;
  }

  /**
   * Sanitize data by removing potentially dangerous content
   * @param {any} data - Data to sanitize
   * @returns {any} - Sanitized data
   */
  static sanitizeData(data) {
    if (typeof data === 'string') {
      // Remove HTML tags and script content
      return data
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    }

    if (Array.isArray(data)) {
      return data.map(item => ValidationUtils.sanitizeData(item));
    }

    if (data && typeof data === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = ValidationUtils.sanitizeData(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Create a custom validation error
   * @param {string} message - Error message
   * @param {Array} details - Error details
   * @param {number} statusCode - HTTP status code
   * @returns {Error} - Custom validation error
   */
  static createValidationError(message, details = [], statusCode = 400) {
    const error = new Error(message);
    error.name = 'ValidationError';
    error.statusCode = statusCode;
    error.details = details;
    error.isValidationError = true;
    return error;
  }

  /**
   * Check if error is a validation error
   * @param {Error} error - Error to check
   * @returns {boolean} - True if validation error
   */
  static isValidationError(error) {
    return error && (error.isValidationError || error.name === 'ValidationError');
  }

  /**
   * Format validation errors for API response
   * @param {Error} error - Validation error
   * @returns {Object} - Formatted error response
   */
  static formatValidationError(error) {
    if (!ValidationUtils.isValidationError(error)) {
      return {
        success: false,
        error: 'Validation failed',
        details: {
          message: error.message || 'Unknown validation error'
        }
      };
    }

    return {
      success: false,
      error: 'Validation failed',
      details: {
        message: error.message,
        errors: error.details || []
      }
    };
  }

  /**
   * Validate business rules
   * @param {Object} data - Data to validate
   * @param {Array} rules - Array of business rule functions
   * @returns {Object} - Validation result
   */
  static validateBusinessRules(data, rules = []) {
    const errors = [];

    for (const rule of rules) {
      try {
        const result = rule(data);
        if (result && !result.isValid) {
          errors.push({
            field: result.field || 'unknown',
            message: result.message || 'Business rule validation failed',
            type: 'business_rule'
          });
        }
      } catch (error) {
        logger.validationError('Business rule validation error', {
          error: error.message,
          stack: error.stack,
          rule: rule.name || 'anonymous'
        });

        errors.push({
          field: 'unknown',
          message: 'Business rule validation failed',
          type: 'business_rule_error'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : null
    };
  }
}

module.exports = ValidationUtils;