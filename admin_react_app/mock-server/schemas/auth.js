const Joi = require('joi');
const { baseSchemas } = require('./base');

/**
 * Authentication validation schemas
 */
const authSchemas = {
  // Login request validation
  login: {
    body: Joi.object({
      user_email: baseSchemas.email.messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required for login'
      }),
      user_password: Joi.string()
        .min(1)
        .max(128)
        .required()
        .messages({
          'string.empty': 'Password cannot be empty',
          'any.required': 'Password is required for login'
        }),
      role: baseSchemas.role.valid('super_admin', 'admin').messages({
        'any.only': 'Role must be either super_admin or admin',
        'any.required': 'Role is required for login'
      })
    }).required()
  },

  // Token refresh validation
  refreshToken: {
    body: Joi.object({
      refresh_token: baseSchemas.jwtToken.messages({
        'string.pattern.base': 'Invalid refresh token format',
        'any.required': 'Refresh token is required'
      })
    }).required()
  },

  // Logout validation
  logout: {
    headers: Joi.object({
      authorization: Joi.string()
        .pattern(/^Bearer [A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/)
        .required()
        .messages({
          'string.pattern.base': 'Authorization header must be in Bearer token format',
          'any.required': 'Authorization header is required'
        })
    }).unknown(true) // Allow other headers
  },

  // Password change validation
  changePassword: {
    body: Joi.object({
      current_password: Joi.string()
        .min(1)
        .max(128)
        .required()
        .messages({
          'string.empty': 'Current password cannot be empty',
          'any.required': 'Current password is required'
        }),
      new_password: baseSchemas.password.messages({
        'string.pattern.base': 'New password must contain at least 8 characters with uppercase, lowercase, number and special character',
        'any.required': 'New password is required'
      }),
      confirm_password: Joi.string()
        .valid(Joi.ref('new_password'))
        .required()
        .messages({
          'any.only': 'Password confirmation does not match new password',
          'any.required': 'Password confirmation is required'
        })
    }).required()
  },

  // Profile update validation
  updateProfile: {
    body: Joi.object({
      user_name: baseSchemas.optionalName.messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name must not exceed 100 characters'
      }),
      user_phone_no: baseSchemas.optionalPhoneNumber.messages({
        'string.pattern.base': 'Phone number must be a valid Indian mobile number'
      }),
      user_address: baseSchemas.optionalAddress.messages({
        'string.min': 'Address must be at least 10 characters long',
        'string.max': 'Address must not exceed 500 characters'
      })
    }).min(1).required().messages({
      'object.min': 'At least one field must be provided for update'
    })
  },

  // Email verification validation
  verifyEmail: {
    body: Joi.object({
      verification_token: Joi.string()
        .length(32)
        .alphanum()
        .required()
        .messages({
          'string.length': 'Verification token must be exactly 32 characters',
          'string.alphanum': 'Verification token must contain only alphanumeric characters',
          'any.required': 'Verification token is required'
        })
    }).required()
  },

  // Password reset request validation
  requestPasswordReset: {
    body: Joi.object({
      user_email: baseSchemas.email.messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required for password reset'
      })
    }).required()
  },

  // Password reset validation
  resetPassword: {
    body: Joi.object({
      reset_token: Joi.string()
        .length(32)
        .alphanum()
        .required()
        .messages({
          'string.length': 'Reset token must be exactly 32 characters',
          'string.alphanum': 'Reset token must contain only alphanumeric characters',
          'any.required': 'Reset token is required'
        }),
      new_password: baseSchemas.password.messages({
        'string.pattern.base': 'New password must contain at least 8 characters with uppercase, lowercase, number and special character',
        'any.required': 'New password is required'
      }),
      confirm_password: Joi.string()
        .valid(Joi.ref('new_password'))
        .required()
        .messages({
          'any.only': 'Password confirmation does not match new password',
          'any.required': 'Password confirmation is required'
        })
    }).required()
  },

  // Two-factor authentication setup validation
  setupTwoFactor: {
    body: Joi.object({
      phone_number: baseSchemas.phoneNumber.messages({
        'string.pattern.base': 'Phone number must be a valid Indian mobile number',
        'any.required': 'Phone number is required for 2FA setup'
      }),
      method: Joi.string()
        .valid('sms', 'call')
        .default('sms')
        .messages({
          'any.only': 'Two-factor method must be either sms or call'
        })
    }).required()
  },

  // Two-factor authentication verification validation
  verifyTwoFactor: {
    body: Joi.object({
      verification_code: Joi.string()
        .length(6)
        .pattern(/^\d{6}$/)
        .required()
        .messages({
          'string.length': 'Verification code must be exactly 6 digits',
          'string.pattern.base': 'Verification code must contain only numbers',
          'any.required': 'Verification code is required'
        }),
      session_token: Joi.string()
        .length(32)
        .alphanum()
        .required()
        .messages({
          'string.length': 'Session token must be exactly 32 characters',
          'string.alphanum': 'Session token must contain only alphanumeric characters',
          'any.required': 'Session token is required'
        })
    }).required()
  }
};

/**
 * Business rule validators for authentication
 */
const authBusinessRules = {
  // Validate login attempt rate limiting
  validateLoginAttempts: (data) => {
    // This would typically check against a rate limiting store
    // For mock server, we'll simulate basic validation
    const { body } = data;
    
    if (!body || !body.user_email) {
      return {
        isValid: false,
        field: 'user_email',
        message: 'Email is required for rate limiting check'
      };
    }

    // Simulate rate limiting logic
    // In real implementation, this would check Redis or similar store
    return { isValid: true };
  },

  // Validate password strength beyond basic requirements
  validatePasswordStrength: (data) => {
    const { body } = data;
    
    if (!body || !body.new_password) {
      return { isValid: true }; // Skip if no new password
    }

    const password = body.new_password;
    const commonPasswords = [
      'password123', 'admin123', 'qwerty123', '123456789',
      'password@123', 'admin@123', 'welcome123'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      return {
        isValid: false,
        field: 'new_password',
        message: 'Password is too common. Please choose a more secure password.'
      };
    }

    // Check for repeated characters
    if (/(.)\1{3,}/.test(password)) {
      return {
        isValid: false,
        field: 'new_password',
        message: 'Password cannot contain more than 3 consecutive identical characters.'
      };
    }

    return { isValid: true };
  },

  // Validate email domain for admin accounts
  validateAdminEmailDomain: (data) => {
    const { body } = data;
    
    if (!body || !body.user_email || !body.role) {
      return { isValid: true }; // Skip if incomplete data
    }

    if (body.role === 'super_admin' || body.role === 'admin') {
      const allowedDomains = ['parking.com', 'admin.parking.com'];
      const emailDomain = body.user_email.split('@')[1];
      
      if (!allowedDomains.includes(emailDomain)) {
        return {
          isValid: false,
          field: 'user_email',
          message: 'Admin accounts must use company email domain (@parking.com or @admin.parking.com)'
        };
      }
    }

    return { isValid: true };
  },

  // Validate session context for sensitive operations
  validateSessionContext: (data) => {
    const { user, headers } = data;
    
    if (!user) {
      return { isValid: true }; // Skip if no user context
    }

    // Check for suspicious session patterns
    const userAgent = headers['user-agent'] || '';
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userAgent)) {
        return {
          isValid: false,
          field: 'session',
          message: 'Suspicious session detected. Please use a standard web browser.'
        };
      }
    }

    return { isValid: true };
  }
};

module.exports = {
  authSchemas,
  authBusinessRules
};