const ValidationMiddleware = require('./validation');
const { sessionSchemas, sessionBusinessRules } = require('../schemas/session');

/**
 * Session management validation middleware
 */
class SessionValidation {
  /**
   * Validate vehicle check-in request
   */
  static validateCheckin() {
    return [
      ValidationMiddleware.createValidator(sessionSchemas.checkin),
      ValidationMiddleware.createBusinessRuleValidator([
        sessionBusinessRules.validateSlotAvailability,
        sessionBusinessRules.validateVehicleAvailability,
        sessionBusinessRules.validateLotCapacity,
        sessionBusinessRules.validateAdminLotAccess
      ])
    ];
  }

  /**
   * Validate vehicle check-out request
   */
  static validateCheckout() {
    return [
      ValidationMiddleware.createValidator(sessionSchemas.checkout),
      ValidationMiddleware.createBusinessRuleValidator([
        sessionBusinessRules.validateSessionForCheckout,
        sessionBusinessRules.validatePaymentAmount
      ])
    ];
  }

  /**
   * Validate get session request
   */
  static validateGetSession() {
    return ValidationMiddleware.createValidator(sessionSchemas.getSession);
  }

  /**
   * Validate get sessions by user request
   */
  static validateGetSessionsByUser() {
    return [
      ValidationMiddleware.createValidator(sessionSchemas.getSessionsByUser),
      ValidationMiddleware.createBusinessRuleValidator([
        sessionBusinessRules.validateSessionDateRange
      ])
    ];
  }

  /**
   * Validate get all sessions request (Super Admin only)
   */
  static validateGetAllSessions() {
    return [
      ValidationMiddleware.createValidator(sessionSchemas.getAllSessions),
      ValidationMiddleware.createBusinessRuleValidator([
        sessionBusinessRules.validateSessionDateRange
      ])
    ];
  }

  /**
   * Validate update session request
   */
  static validateUpdateSession() {
    return [
      ValidationMiddleware.createValidator(sessionSchemas.updateSession),
      ValidationMiddleware.createBusinessRuleValidator([
        sessionBusinessRules.validateVehicleAvailability
      ])
    ];
  }

  /**
   * Validate cancel session request
   */
  static validateCancelSession() {
    return [
      ValidationMiddleware.createValidator(sessionSchemas.cancelSession),
      ValidationMiddleware.createBusinessRuleValidator([
        sessionBusinessRules.validateSessionForCheckout
      ])
    ];
  }

  /**
   * Validate extend session request
   */
  static validateExtendSession() {
    return [
      ValidationMiddleware.createValidator(sessionSchemas.extendSession),
      ValidationMiddleware.createBusinessRuleValidator([
        sessionBusinessRules.validateSessionExtension,
        sessionBusinessRules.validateLotCapacity
      ])
    ];
  }

  /**
   * Validate session analytics request
   */
  static validateGetSessionAnalytics() {
    return [
      ValidationMiddleware.createValidator(sessionSchemas.getSessionAnalytics),
      ValidationMiddleware.createBusinessRuleValidator([
        sessionBusinessRules.validateSessionDateRange
      ])
    ];
  }

  /**
   * Create role-based session validation
   * Different validation rules for super_admin vs admin
   */
  static validateSessionAccess() {
    return ValidationMiddleware.createConditionalValidator(
      (req) => {
        // Super admins can access all sessions
        if (req.user?.role === 'super_admin') {
          return true;
        }
        
        // Admins can only access sessions from their assigned lots
        if (req.user?.role === 'admin') {
          return true; // Business rules will handle lot access validation
        }
        
        return false;
      },
      {
        // No additional schema validation needed, business rules handle access
      }
    );
  }

  /**
   * Validate session operation permissions
   */
  static validateSessionOperationPermissions() {
    return ValidationMiddleware.createBusinessRuleValidator([
      sessionBusinessRules.validateAdminLotAccess
    ]);
  }

  /**
   * Create validation for session bulk operations
   */
  static validateBulkSessionOperation(operationType) {
    const bulkSchema = {
      body: {
        session_ids: require('../schemas/base').baseSchemas.stringArray.items(
          require('../schemas/base').baseSchemas.ticketId
        ).min(1).max(50).messages({
          'array.min': 'At least one session ID must be provided',
          'array.max': 'Cannot process more than 50 sessions at once'
        }),
        operation: require('joi').string().valid(operationType).required()
      }
    };

    return [
      ValidationMiddleware.createValidator(bulkSchema),
      ValidationMiddleware.createBusinessRuleValidator([
        sessionBusinessRules.validateAdminLotAccess
      ])
    ];
  }

  /**
   * Validate session search and filtering
   */
  static validateSessionSearch() {
    const searchSchema = {
      query: {
        search_term: require('../schemas/base').baseSchemas.search,
        search_fields: require('joi').array().items(
          require('joi').string().valid('vehicle_reg_no', 'ticket_id', 'user_name', 'lot_name')
        ).min(1).default(['vehicle_reg_no', 'ticket_id']),
        ...sessionSchemas.getAllSessions.query.describe().keys
      }
    };

    return ValidationMiddleware.createValidator(searchSchema);
  }

  /**
   * Create validation middleware with session-specific error handling
   */
  static validateWithSessionErrorHandler(schemas) {
    return ValidationMiddleware.createValidatorWithCustomError(
      schemas,
      SessionValidation.sessionErrorHandler
    );
  }

  /**
   * Custom error handler for session validation errors
   */
  static sessionErrorHandler(errors, req, res, next) {
    const logger = require('../utils/logger');
    
    logger.validationError('Session operation validation failed', {
      errors,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.user_id,
      userRole: req.user?.role,
      ip: req.ip
    });

    // Check for specific session-related errors
    const slotError = errors.find(err => err.field === 'slot_id');
    const vehicleError = errors.find(err => err.field === 'vehicle_reg_no');
    const capacityError = errors.find(err => err.message?.includes('capacity'));
    const accessError = errors.find(err => err.message?.includes('access'));

    if (accessError) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        details: {
          message: 'You do not have access to perform this operation on the specified parking lot',
          errors: [accessError]
        }
      });
    }

    if (slotError || vehicleError || capacityError) {
      return res.status(409).json({
        success: false,
        error: 'Session conflict',
        details: {
          message: 'The requested operation conflicts with existing session data',
          errors: errors.filter(err => 
            err.field === 'slot_id' || 
            err.field === 'vehicle_reg_no' || 
            err.message?.includes('capacity')
          )
        }
      });
    }

    // Standard validation error response
    return res.status(400).json({
      success: false,
      error: 'Session validation failed',
      details: {
        message: 'One or more validation errors occurred',
        errors: errors
      }
    });
  }

  /**
   * Validate session time constraints
   */
  static validateSessionTimeConstraints() {
    return ValidationMiddleware.createBusinessRuleValidator([
      (data) => {
        const now = new Date();
        const businessHours = {
          start: 6, // 6 AM
          end: 23   // 11 PM
        };

        const currentHour = now.getHours();
        
        if (currentHour < businessHours.start || currentHour >= businessHours.end) {
          return {
            isValid: false,
            field: 'time',
            message: `Parking operations are only allowed between ${businessHours.start}:00 AM and ${businessHours.end}:00 PM`
          };
        }

        return { isValid: true };
      }
    ]);
  }
}

module.exports = SessionValidation;