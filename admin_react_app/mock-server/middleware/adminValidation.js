const ValidationMiddleware = require('./validation');
const { adminSchemas, adminBusinessRules } = require('../schemas/admin');

/**
 * Admin management validation middleware
 */
class AdminValidation {
  /**
   * Validate admin creation request
   */
  static validateCreateAdmin() {
    return [
      ValidationMiddleware.createValidator(adminSchemas.createAdmin),
      ValidationMiddleware.createBusinessRuleValidator([
        adminBusinessRules.validateEmailUniqueness,
        adminBusinessRules.validateLotAssignments,
        adminBusinessRules.validateLotAssignmentLimits,
        adminBusinessRules.validateAdminRolePermissions
      ])
    ];
  }

  /**
   * Validate admin update request
   */
  static validateUpdateAdmin() {
    return [
      ValidationMiddleware.createValidator(adminSchemas.updateAdmin),
      ValidationMiddleware.createBusinessRuleValidator([
        adminBusinessRules.validateEmailUniqueness,
        adminBusinessRules.validateLotAssignments,
        adminBusinessRules.validateLotAssignmentLimits,
        adminBusinessRules.validateAdminRolePermissions
      ])
    ];
  }

  /**
   * Validate get admin request
   */
  static validateGetAdmin() {
    return ValidationMiddleware.createValidator(adminSchemas.getAdmin);
  }

  /**
   * Validate delete admin request
   */
  static validateDeleteAdmin() {
    return [
      ValidationMiddleware.createValidator(adminSchemas.deleteAdmin),
      ValidationMiddleware.createBusinessRuleValidator([
        adminBusinessRules.validateAdminDeletion,
        adminBusinessRules.validateAdminRolePermissions
      ])
    ];
  }

  /**
   * Validate get all admins request
   */
  static validateGetAllAdmins() {
    return [
      ValidationMiddleware.createValidator(adminSchemas.getAllAdmins),
      ValidationMiddleware.createBusinessRuleValidator([
        adminBusinessRules.validateAdminRolePermissions
      ])
    ];
  }

  /**
   * Validate assign lots request
   */
  static validateAssignLots() {
    return [
      ValidationMiddleware.createValidator(adminSchemas.assignLots),
      ValidationMiddleware.createBusinessRuleValidator([
        adminBusinessRules.validateLotAssignments,
        adminBusinessRules.validateLotAssignmentLimits,
        adminBusinessRules.validateAdminRolePermissions
      ])
    ];
  }

  /**
   * Validate remove lot assignments request
   */
  static validateRemoveLotAssignments() {
    return [
      ValidationMiddleware.createValidator(adminSchemas.removeLotAssignments),
      ValidationMiddleware.createBusinessRuleValidator([
        adminBusinessRules.validateLotAssignments,
        adminBusinessRules.validateAdminRolePermissions
      ])
    ];
  }

  /**
   * Validate get admin lots request
   */
  static validateGetAdminLots() {
    return ValidationMiddleware.createValidator(adminSchemas.getAdminLots);
  }

  /**
   * Validate get admin activity request
   */
  static validateGetAdminActivity() {
    return [
      ValidationMiddleware.createValidator(adminSchemas.getAdminActivity),
      ValidationMiddleware.createBusinessRuleValidator([
        adminBusinessRules.validateDateRange
      ])
    ];
  }

  /**
   * Create conditional validation for admin operations
   * Only applies validation if user is authenticated and has proper role
   */
  static validateAdminOperation(schemas) {
    return ValidationMiddleware.createConditionalValidator(
      (req) => req.user && (req.user.role === 'super_admin' || req.user.role === 'admin'),
      schemas
    );
  }

  /**
   * Validate admin access to specific resources
   */
  static validateAdminResourceAccess() {
    return ValidationMiddleware.createBusinessRuleValidator([
      adminBusinessRules.validateAdminRolePermissions
    ]);
  }

  /**
   * Create validation middleware with custom error handling for admin operations
   */
  static validateWithCustomError(schemas, errorHandler) {
    return ValidationMiddleware.createValidatorWithCustomError(
      schemas,
      errorHandler || AdminValidation.defaultAdminErrorHandler
    );
  }

  /**
   * Default error handler for admin validation errors
   */
  static defaultAdminErrorHandler(errors, req, res, next) {
    const logger = require('../utils/logger');
    
    logger.validationError('Admin operation validation failed', {
      errors,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.user_id,
      userRole: req.user?.role,
      ip: req.ip
    });

    // Check if it's a permission error
    const permissionError = errors.find(err => 
      err.field === 'role' || err.field === 'authentication'
    );

    if (permissionError) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        details: {
          message: 'You do not have permission to perform this operation',
          required_role: 'super_admin',
          current_role: req.user?.role || 'unauthenticated'
        }
      });
    }

    // Standard validation error response
    return res.status(400).json({
      success: false,
      error: 'Admin operation validation failed',
      details: {
        message: 'One or more validation errors occurred',
        errors: errors
      }
    });
  }
}

module.exports = AdminValidation;