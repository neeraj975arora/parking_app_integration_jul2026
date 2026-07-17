const ValidationMiddleware = require('./validation');
const { authSchemas, authBusinessRules } = require('../schemas/auth');

/**
 * Authentication validation middleware
 */
class AuthValidation {
  /**
   * Validate login request
   */
  static validateLogin() {
    return [
      ValidationMiddleware.createValidator(authSchemas.login),
      ValidationMiddleware.createBusinessRuleValidator([
        authBusinessRules.validateLoginAttempts,
        authBusinessRules.validateAdminEmailDomain,
        authBusinessRules.validateSessionContext
      ])
    ];
  }

  /**
   * Validate token refresh request
   */
  static validateRefreshToken() {
    return ValidationMiddleware.createValidator(authSchemas.refreshToken);
  }

  /**
   * Validate logout request
   */
  static validateLogout() {
    return ValidationMiddleware.createValidator(authSchemas.logout);
  }

  /**
   * Validate password change request
   */
  static validateChangePassword() {
    return [
      ValidationMiddleware.createValidator(authSchemas.changePassword),
      ValidationMiddleware.createBusinessRuleValidator([
        authBusinessRules.validatePasswordStrength,
        authBusinessRules.validateSessionContext
      ])
    ];
  }

  /**
   * Validate profile update request
   */
  static validateUpdateProfile() {
    return ValidationMiddleware.createValidator(authSchemas.updateProfile);
  }

  /**
   * Validate email verification request
   */
  static validateVerifyEmail() {
    return ValidationMiddleware.createValidator(authSchemas.verifyEmail);
  }

  /**
   * Validate password reset request
   */
  static validateRequestPasswordReset() {
    return [
      ValidationMiddleware.createValidator(authSchemas.requestPasswordReset),
      ValidationMiddleware.createBusinessRuleValidator([
        authBusinessRules.validateAdminEmailDomain
      ])
    ];
  }

  /**
   * Validate password reset
   */
  static validateResetPassword() {
    return [
      ValidationMiddleware.createValidator(authSchemas.resetPassword),
      ValidationMiddleware.createBusinessRuleValidator([
        authBusinessRules.validatePasswordStrength
      ])
    ];
  }

  /**
   * Validate two-factor authentication setup
   */
  static validateSetupTwoFactor() {
    return ValidationMiddleware.createValidator(authSchemas.setupTwoFactor);
  }

  /**
   * Validate two-factor authentication verification
   */
  static validateVerifyTwoFactor() {
    return ValidationMiddleware.createValidator(authSchemas.verifyTwoFactor);
  }
}

module.exports = AuthValidation;