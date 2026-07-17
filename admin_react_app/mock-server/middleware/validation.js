const ValidationUtils = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * Validation middleware factory
 * Creates validation middleware for different validation scenarios
 */
class ValidationMiddleware {
  /**
   * Create a comprehensive validation middleware
   * @param {Object} schemas - Validation schemas for different request parts
   * @param {Object} options - Validation options
   * @returns {Function} - Express middleware function
   */
  static createValidator(schemas, options = {}) {
    return async (req, res, next) => {
      try {
        const validationResults = {};
        const errors = [];

        // Validate parameters
        if (schemas.params) {
          const paramValidation = ValidationUtils.validate(req.params, schemas.params, options);
          validationResults.params = paramValidation;
          
          if (!paramValidation.isValid) {
            errors.push(...paramValidation.errors.map(err => ({ ...err, source: 'params' })));
          } else {
            req.params = paramValidation.value;
          }
        }

        // Validate query parameters
        if (schemas.query) {
          const queryValidation = ValidationUtils.validate(req.query, schemas.query, options);
          validationResults.query = queryValidation;
          
          if (!queryValidation.isValid) {
            errors.push(...queryValidation.errors.map(err => ({ ...err, source: 'query' })));
          } else {
            req.query = queryValidation.value;
          }
        }

        // Validate request body
        if (schemas.body) {
          const bodyValidation = ValidationUtils.validate(req.body, schemas.body, options);
          validationResults.body = bodyValidation;
          
          if (!bodyValidation.isValid) {
            errors.push(...bodyValidation.errors.map(err => ({ ...err, source: 'body' })));
          } else {
            req.body = bodyValidation.value;
          }
        }

        // Validate headers
        if (schemas.headers) {
          const headerValidation = ValidationUtils.validate(req.headers, schemas.headers, options);
          validationResults.headers = headerValidation;
          
          if (!headerValidation.isValid) {
            errors.push(...headerValidation.errors.map(err => ({ ...err, source: 'headers' })));
          }
        }

        // If there are validation errors, return them
        if (errors.length > 0) {
          logger.validationError('Request validation failed', {
            errors,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: {
              message: 'One or more validation errors occurred',
              errors: errors
            }
          });
        }

        // Store validation results in request for potential use in route handlers
        req.validationResults = validationResults;

        logger.validation('Request validation successful', {
          url: req.originalUrl,
          method: req.method,
          validatedSources: Object.keys(schemas)
        });

        next();

      } catch (error) {
        logger.validationError('Validation middleware error', {
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
  }

  /**
   * Create business rule validation middleware
   * @param {Array} rules - Array of business rule validation functions
   * @returns {Function} - Express middleware function
   */
  static createBusinessRuleValidator(rules = []) {
    return async (req, res, next) => {
      try {
        // Combine all request data for business rule validation
        const requestData = {
          params: req.params || {},
          query: req.query || {},
          body: req.body || {},
          user: req.user || null,
          headers: req.headers || {}
        };

        const validation = ValidationUtils.validateBusinessRules(requestData, rules);

        if (!validation.isValid) {
          logger.validationError('Business rule validation failed', {
            errors: validation.errors,
            url: req.originalUrl,
            method: req.method,
            userId: req.user?.user_id,
            ip: req.ip
          });

          return res.status(400).json({
            success: false,
            error: 'Business rule validation failed',
            details: {
              message: 'One or more business rules were violated',
              errors: validation.errors
            }
          });
        }

        logger.validation('Business rule validation successful', {
          url: req.originalUrl,
          method: req.method,
          userId: req.user?.user_id,
          rulesCount: rules.length
        });

        next();

      } catch (error) {
        logger.validationError('Business rule validation middleware error', {
          error: error.message,
          stack: error.stack,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip
        });

        res.status(500).json({
          success: false,
          error: 'Internal business rule validation error'
        });
      }
    };
  }

  /**
   * Create sanitization middleware
   * @param {Array} fields - Fields to sanitize (default: all)
   * @returns {Function} - Express middleware function
   */
  static createSanitizer(fields = null) {
    return (req, res, next) => {
      try {
        // Sanitize request body
        if (req.body) {
          if (fields) {
            for (const field of fields) {
              if (req.body[field] !== undefined) {
                req.body[field] = ValidationUtils.sanitizeData(req.body[field]);
              }
            }
          } else {
            req.body = ValidationUtils.sanitizeData(req.body);
          }
        }

        // Sanitize query parameters
        if (req.query) {
          if (fields) {
            for (const field of fields) {
              if (req.query[field] !== undefined) {
                req.query[field] = ValidationUtils.sanitizeData(req.query[field]);
              }
            }
          } else {
            req.query = ValidationUtils.sanitizeData(req.query);
          }
        }

        // Sanitize parameters
        if (req.params) {
          if (fields) {
            for (const field of fields) {
              if (req.params[field] !== undefined) {
                req.params[field] = ValidationUtils.sanitizeData(req.params[field]);
              }
            }
          } else {
            req.params = ValidationUtils.sanitizeData(req.params);
          }
        }

        logger.validation('Request sanitization completed', {
          url: req.originalUrl,
          method: req.method,
          sanitizedFields: fields || 'all'
        });

        next();

      } catch (error) {
        logger.validationError('Sanitization middleware error', {
          error: error.message,
          stack: error.stack,
          url: req.originalUrl,
          method: req.method
        });

        res.status(500).json({
          success: false,
          error: 'Internal sanitization error'
        });
      }
    };
  }

  /**
   * Create conditional validation middleware
   * @param {Function} condition - Function that returns true if validation should be applied
   * @param {Object} schemas - Validation schemas
   * @param {Object} options - Validation options
   * @returns {Function} - Express middleware function
   */
  static createConditionalValidator(condition, schemas, options = {}) {
    return async (req, res, next) => {
      try {
        const shouldValidate = await condition(req);
        
        if (!shouldValidate) {
          logger.validation('Conditional validation skipped', {
            url: req.originalUrl,
            method: req.method,
            reason: 'condition not met'
          });
          return next();
        }

        // Apply validation
        const validator = ValidationMiddleware.createValidator(schemas, options);
        return validator(req, res, next);

      } catch (error) {
        logger.validationError('Conditional validation middleware error', {
          error: error.message,
          stack: error.stack,
          url: req.originalUrl,
          method: req.method
        });

        res.status(500).json({
          success: false,
          error: 'Internal conditional validation error'
        });
      }
    };
  }

  /**
   * Create validation middleware with custom error handler
   * @param {Object} schemas - Validation schemas
   * @param {Function} errorHandler - Custom error handler function
   * @param {Object} options - Validation options
   * @returns {Function} - Express middleware function
   */
  static createValidatorWithCustomError(schemas, errorHandler, options = {}) {
    return async (req, res, next) => {
      try {
        const errors = [];

        // Perform validation
        if (schemas.params) {
          const validation = ValidationUtils.validate(req.params, schemas.params, options);
          if (!validation.isValid) {
            errors.push(...validation.errors.map(err => ({ ...err, source: 'params' })));
          } else {
            req.params = validation.value;
          }
        }

        if (schemas.query) {
          const validation = ValidationUtils.validate(req.query, schemas.query, options);
          if (!validation.isValid) {
            errors.push(...validation.errors.map(err => ({ ...err, source: 'query' })));
          } else {
            req.query = validation.value;
          }
        }

        if (schemas.body) {
          const validation = ValidationUtils.validate(req.body, schemas.body, options);
          if (!validation.isValid) {
            errors.push(...validation.errors.map(err => ({ ...err, source: 'body' })));
          } else {
            req.body = validation.value;
          }
        }

        // If there are errors, use custom error handler
        if (errors.length > 0) {
          return errorHandler(errors, req, res, next);
        }

        next();

      } catch (error) {
        logger.validationError('Custom validation middleware error', {
          error: error.message,
          stack: error.stack,
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
}

module.exports = ValidationMiddleware;