const Joi = require('joi');
const { baseSchemas } = require('./base');

/**
 * Admin management validation schemas
 */
const adminSchemas = {
  // Create admin validation
  createAdmin: {
    body: Joi.object({
      name: baseSchemas.name.messages({
        'string.min': 'Admin name must be at least 2 characters long',
        'string.max': 'Admin name must not exceed 100 characters',
        'any.required': 'Admin name is required'
      }),
      email: baseSchemas.email.messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required for admin creation'
      }),
      password: baseSchemas.password.messages({
        'string.pattern.base': 'Password must contain at least 8 characters with uppercase, lowercase, number and special character',
        'any.required': 'Password is required for admin creation'
      }),
      assigned_lots: baseSchemas.numberArray.min(1).max(10).messages({
        'array.min': 'At least one parking lot must be assigned',
        'array.max': 'Cannot assign more than 10 parking lots to a single admin',
        'any.required': 'Parking lot assignments are required'
      }),
      role: Joi.string().valid('admin').default('admin').messages({
        'any.only': 'Role must be admin for admin creation'
      }),
      phone_number: baseSchemas.optionalPhoneNumber.messages({
        'string.pattern.base': 'Phone number must be a valid Indian mobile number'
      }),
      address: baseSchemas.optionalAddress.messages({
        'string.min': 'Address must be at least 10 characters long',
        'string.max': 'Address must not exceed 500 characters'
      })
    }).required()
  },

  // Update admin validation
  updateAdmin: {
    params: Joi.object({
      user_id: baseSchemas.objectId.messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
      })
    }).required(),
    body: Joi.object({
      name: baseSchemas.optionalName.messages({
        'string.min': 'Admin name must be at least 2 characters long',
        'string.max': 'Admin name must not exceed 100 characters'
      }),
      email: baseSchemas.optionalEmail.messages({
        'string.email': 'Please provide a valid email address'
      }),
      assigned_lots: baseSchemas.optionalNumberArray.min(1).max(10).messages({
        'array.min': 'At least one parking lot must be assigned',
        'array.max': 'Cannot assign more than 10 parking lots to a single admin'
      }),
      phone_number: baseSchemas.optionalPhoneNumber.messages({
        'string.pattern.base': 'Phone number must be a valid Indian mobile number'
      }),
      address: baseSchemas.optionalAddress.messages({
        'string.min': 'Address must be at least 10 characters long',
        'string.max': 'Address must not exceed 500 characters'
      }),
      is_active: baseSchemas.optionalBoolean.messages({
        'boolean.base': 'Active status must be true or false'
      })
    }).min(1).required().messages({
      'object.min': 'At least one field must be provided for update'
    })
  },

  // Get admin details validation
  getAdmin: {
    params: Joi.object({
      user_id: baseSchemas.objectId.messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
      })
    }).required()
  },

  // Delete admin validation
  deleteAdmin: {
    params: Joi.object({
      user_id: baseSchemas.objectId.messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
      })
    }).required(),
    body: Joi.object({
      confirm_deletion: Joi.boolean().valid(true).required().messages({
        'any.only': 'Deletion must be confirmed by setting confirm_deletion to true',
        'any.required': 'Deletion confirmation is required'
      }),
      reason: Joi.string().trim().min(10).max(500).optional().messages({
        'string.min': 'Deletion reason must be at least 10 characters long',
        'string.max': 'Deletion reason must not exceed 500 characters'
      })
    }).required()
  },

  // Get all admins validation
  getAllAdmins: {
    query: Joi.object({
      page: baseSchemas.page,
      limit: baseSchemas.limit,
      sort_by: Joi.string().valid('name', 'email', 'created_at', 'last_login').default('created_at'),
      sort_order: baseSchemas.sortOrder,
      search: baseSchemas.search.messages({
        'string.min': 'Search term must be at least 1 character long',
        'string.max': 'Search term must not exceed 100 characters'
      }),
      status: Joi.string().valid('active', 'inactive', 'all').default('all'),
      lot_id: baseSchemas.optionalObjectId.messages({
        'number.base': 'Lot ID must be a number',
        'number.integer': 'Lot ID must be an integer',
        'number.positive': 'Lot ID must be positive'
      })
    }).optional()
  },

  // Assign lots to admin validation
  assignLots: {
    params: Joi.object({
      user_id: baseSchemas.objectId.messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
      })
    }).required(),
    body: Joi.object({
      lot_ids: baseSchemas.numberArray.min(1).max(10).messages({
        'array.min': 'At least one parking lot must be assigned',
        'array.max': 'Cannot assign more than 10 parking lots to a single admin',
        'any.required': 'Parking lot IDs are required'
      }),
      replace_existing: baseSchemas.optionalBoolean.default(false).messages({
        'boolean.base': 'Replace existing flag must be true or false'
      })
    }).required()
  },

  // Remove lot assignments validation
  removeLotAssignments: {
    params: Joi.object({
      user_id: baseSchemas.objectId.messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
      })
    }).required(),
    body: Joi.object({
      lot_ids: baseSchemas.numberArray.min(1).messages({
        'array.min': 'At least one parking lot ID must be provided',
        'any.required': 'Parking lot IDs are required'
      })
    }).required()
  },

  // Get admin lot assignments validation
  getAdminLots: {
    params: Joi.object({
      user_id: baseSchemas.objectId.messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
      })
    }).required()
  },

  // Admin activity log validation
  getAdminActivity: {
    params: Joi.object({
      user_id: baseSchemas.objectId.messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
      })
    }).required(),
    query: Joi.object({
      start_date: baseSchemas.optionalDateString.messages({
        'string.pattern.base': 'Start date must be in YYYY-MM-DD format'
      }),
      end_date: baseSchemas.optionalDateString.messages({
        'string.pattern.base': 'End date must be in YYYY-MM-DD format'
      }),
      activity_type: Joi.string().valid('login', 'logout', 'session_management', 'payment_collection', 'closure').optional(),
      page: baseSchemas.page,
      limit: baseSchemas.limit
    }).optional()
  }
};

/**
 * Business rule validators for admin management
 */
const adminBusinessRules = {
  // Validate email uniqueness
  validateEmailUniqueness: (data) => {
    const { body } = data;
    
    if (!body || !body.email) {
      return { isValid: true }; // Skip if no email
    }

    // This would typically check against database
    // For mock server, we'll simulate the check
    const mockDataStore = require('../data/mockData');
    
    // Check if email exists in super admins
    for (const [id, admin] of mockDataStore.superAdmins) {
      if (admin.user_email.toLowerCase() === body.email.toLowerCase()) {
        return {
          isValid: false,
          field: 'email',
          message: 'Email address is already registered with another admin account'
        };
      }
    }

    // Check if email exists in admins
    for (const [id, admin] of mockDataStore.admins) {
      if (admin.user_email.toLowerCase() === body.email.toLowerCase()) {
        return {
          isValid: false,
          field: 'email',
          message: 'Email address is already registered with another admin account'
        };
      }
    }

    return { isValid: true };
  },

  // Validate parking lot existence and availability
  validateLotAssignments: (data) => {
    const { body } = data;
    
    if (!body || !body.assigned_lots) {
      return { isValid: true }; // Skip if no lot assignments
    }

    const mockDataStore = require('../data/mockData');
    const assignedLots = Array.isArray(body.assigned_lots) ? body.assigned_lots : [body.assigned_lots];
    
    // Check if all lots exist
    for (const lotId of assignedLots) {
      if (!mockDataStore.parkingLots.has(lotId)) {
        return {
          isValid: false,
          field: 'assigned_lots',
          message: `Parking lot with ID ${lotId} does not exist`
        };
      }

      const lot = mockDataStore.parkingLots.get(lotId);
      if (!lot.is_active) {
        return {
          isValid: false,
          field: 'assigned_lots',
          message: `Parking lot ${lot.name} (ID: ${lotId}) is not active and cannot be assigned`
        };
      }
    }

    // Check for duplicate assignments
    const uniqueLots = [...new Set(assignedLots)];
    if (uniqueLots.length !== assignedLots.length) {
      return {
        isValid: false,
        field: 'assigned_lots',
        message: 'Duplicate parking lot assignments are not allowed'
      };
    }

    return { isValid: true };
  },

  // Validate admin deletion constraints
  validateAdminDeletion: (data) => {
    const { params, user } = data;
    
    if (!params || !params.user_id) {
      return { isValid: true }; // Skip if no user ID
    }

    const targetUserId = parseInt(params.user_id);
    
    // Prevent self-deletion
    if (user && user.user_id === targetUserId) {
      return {
        isValid: false,
        field: 'user_id',
        message: 'You cannot delete your own admin account'
      };
    }

    // Check if admin has active sessions
    const mockDataStore = require('../data/mockData');
    let hasActiveSessions = false;
    
    for (const [sessionId, session] of mockDataStore.sessions) {
      if (session.admin_id === targetUserId && session.status === 'active') {
        hasActiveSessions = true;
        break;
      }
    }

    if (hasActiveSessions) {
      return {
        isValid: false,
        field: 'user_id',
        message: 'Cannot delete admin with active parking sessions. Please complete or transfer sessions first.'
      };
    }

    return { isValid: true };
  },

  // Validate lot assignment limits
  validateLotAssignmentLimits: (data) => {
    const { body } = data;
    
    if (!body || !body.assigned_lots) {
      return { isValid: true }; // Skip if no lot assignments
    }

    const assignedLots = Array.isArray(body.assigned_lots) ? body.assigned_lots : [body.assigned_lots];
    
    // Check maximum assignments per admin
    if (assignedLots.length > 10) {
      return {
        isValid: false,
        field: 'assigned_lots',
        message: 'An admin cannot be assigned more than 10 parking lots'
      };
    }

    // Check if lots are already assigned to other admins (if replace_existing is false)
    if (!body.replace_existing) {
      const mockDataStore = require('../data/mockData');
      
      for (const lotId of assignedLots) {
        for (const [adminId, admin] of mockDataStore.admins) {
          if (admin.assigned_lots && admin.assigned_lots.includes(lotId)) {
            const existingAdmin = admin;
            return {
              isValid: false,
              field: 'assigned_lots',
              message: `Parking lot ${lotId} is already assigned to admin ${existingAdmin.user_name} (ID: ${adminId}). Use replace_existing flag to reassign.`
            };
          }
        }
      }
    }

    return { isValid: true };
  },

  // Validate admin role permissions
  validateAdminRolePermissions: (data) => {
    const { user, params } = data;
    
    if (!user) {
      return {
        isValid: false,
        field: 'authentication',
        message: 'Authentication required for admin operations'
      };
    }

    // Only super admins can manage other admins
    if (user.role !== 'super_admin') {
      return {
        isValid: false,
        field: 'role',
        message: 'Only super administrators can manage admin accounts'
      };
    }

    return { isValid: true };
  },

  // Validate date range for activity logs
  validateDateRange: (data) => {
    const { query } = data;
    
    if (!query || (!query.start_date && !query.end_date)) {
      return { isValid: true }; // Skip if no date range
    }

    if (query.start_date && query.end_date) {
      const startDate = new Date(query.start_date);
      const endDate = new Date(query.end_date);
      
      if (startDate > endDate) {
        return {
          isValid: false,
          field: 'date_range',
          message: 'Start date cannot be later than end date'
        };
      }

      // Check if date range is not too large (max 1 year)
      const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        return {
          isValid: false,
          field: 'date_range',
          message: 'Date range cannot exceed 365 days'
        };
      }
    }

    return { isValid: true };
  }
};

module.exports = {
  adminSchemas,
  adminBusinessRules
};