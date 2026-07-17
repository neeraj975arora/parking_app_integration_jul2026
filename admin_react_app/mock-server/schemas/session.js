const Joi = require('joi');
const { baseSchemas } = require('./base');

/**
 * Session management validation schemas
 */
const sessionSchemas = {
  // Vehicle check-in validation
  checkin: {
    body: Joi.object({
      vehicle_reg_no: baseSchemas.vehicleRegNo.messages({
        'string.pattern.base': 'Vehicle registration number must be in valid Indian format (e.g., DL01AB1234)',
        'any.required': 'Vehicle registration number is required for check-in'
      }),
      slot_id: baseSchemas.objectId.messages({
        'number.base': 'Slot ID must be a number',
        'number.integer': 'Slot ID must be an integer',
        'number.positive': 'Slot ID must be positive',
        'any.required': 'Slot ID is required for check-in'
      }),
      lot_id: baseSchemas.objectId.messages({
        'number.base': 'Lot ID must be a number',
        'number.integer': 'Lot ID must be an integer',
        'number.positive': 'Lot ID must be positive',
        'any.required': 'Lot ID is required for check-in'
      }),
      vehicle_type: baseSchemas.vehicleType.messages({
        'any.only': 'Vehicle type must be either car or motorcycle',
        'any.required': 'Vehicle type is required for check-in'
      }),
      user_id: baseSchemas.optionalObjectId.messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive'
      }),
      notes: baseSchemas.notes.messages({
        'string.max': 'Notes must not exceed 1000 characters'
      })
    }).required()
  },

  // Vehicle check-out validation
  checkout: {
    body: Joi.object({
      ticket_id: baseSchemas.ticketId.messages({
        'string.pattern.base': 'Ticket ID must be in format TKT-YYYYMMDD-XXX',
        'any.required': 'Ticket ID is required for check-out'
      }),
      payment_method: baseSchemas.paymentMethod.messages({
        'any.only': 'Payment method must be cash, digital, or card',
        'any.required': 'Payment method is required for check-out'
      }),
      amount_paid: baseSchemas.optionalAmount.messages({
        'number.base': 'Amount paid must be a number',
        'number.min': 'Amount paid cannot be negative',
        'number.max': 'Amount paid cannot exceed ₹999,999.99',
        'number.precision': 'Amount paid can have at most 2 decimal places'
      }),
      notes: baseSchemas.notes.messages({
        'string.max': 'Notes must not exceed 1000 characters'
      })
    }).required()
  },

  // Get session details validation
  getSession: {
    params: Joi.object({
      ticket_id: baseSchemas.ticketId.messages({
        'string.pattern.base': 'Ticket ID must be in format TKT-YYYYMMDD-XXX',
        'any.required': 'Ticket ID is required'
      })
    }).required()
  },

  // Get sessions by user validation
  getSessionsByUser: {
    params: Joi.object({
      user_id: baseSchemas.objectId.messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
      })
    }).required(),
    query: Joi.object({
      status: Joi.string().valid('active', 'completed', 'cancelled', 'all').default('all'),
      start_date: baseSchemas.optionalDateString.messages({
        'string.pattern.base': 'Start date must be in YYYY-MM-DD format'
      }),
      end_date: baseSchemas.optionalDateString.messages({
        'string.pattern.base': 'End date must be in YYYY-MM-DD format'
      }),
      lot_id: baseSchemas.optionalObjectId.messages({
        'number.base': 'Lot ID must be a number',
        'number.integer': 'Lot ID must be an integer',
        'number.positive': 'Lot ID must be positive'
      }),
      page: baseSchemas.page,
      limit: baseSchemas.limit,
      sort_by: Joi.string().valid('start_time', 'end_time', 'duration_hrs', 'amount_due').default('start_time'),
      sort_order: baseSchemas.sortOrder
    }).optional()
  },

  // Get all sessions validation (Super Admin only)
  getAllSessions: {
    query: Joi.object({
      status: Joi.string().valid('active', 'completed', 'cancelled', 'all').default('all'),
      start_date: baseSchemas.optionalDateString.messages({
        'string.pattern.base': 'Start date must be in YYYY-MM-DD format'
      }),
      end_date: baseSchemas.optionalDateString.messages({
        'string.pattern.base': 'End date must be in YYYY-MM-DD format'
      }),
      lot_id: baseSchemas.optionalObjectId.messages({
        'number.base': 'Lot ID must be a number',
        'number.integer': 'Lot ID must be an integer',
        'number.positive': 'Lot ID must be positive'
      }),
      vehicle_type: baseSchemas.optionalVehicleType.messages({
        'any.only': 'Vehicle type must be either car or motorcycle'
      }),
      payment_status: baseSchemas.optionalPaymentStatus.messages({
        'any.only': 'Payment status must be pending, completed, failed, or refunded'
      }),
      search: baseSchemas.search.messages({
        'string.min': 'Search term must be at least 1 character long',
        'string.max': 'Search term must not exceed 100 characters'
      }),
      page: baseSchemas.page,
      limit: baseSchemas.limit,
      sort_by: Joi.string().valid('start_time', 'end_time', 'duration_hrs', 'amount_due', 'vehicle_reg_no').default('start_time'),
      sort_order: baseSchemas.sortOrder
    }).optional()
  },

  // Update session validation
  updateSession: {
    params: Joi.object({
      ticket_id: baseSchemas.ticketId.messages({
        'string.pattern.base': 'Ticket ID must be in format TKT-YYYYMMDD-XXX',
        'any.required': 'Ticket ID is required'
      })
    }).required(),
    body: Joi.object({
      vehicle_reg_no: baseSchemas.optionalVehicleRegNo.messages({
        'string.pattern.base': 'Vehicle registration number must be in valid Indian format (e.g., DL01AB1234)'
      }),
      slot_number: baseSchemas.optionalSlotNumber.messages({
        'string.min': 'Slot number must be at least 1 character long',
        'string.max': 'Slot number must not exceed 20 characters'
      }),
      notes: baseSchemas.notes.messages({
        'string.max': 'Notes must not exceed 1000 characters'
      })
    }).min(1).required().messages({
      'object.min': 'At least one field must be provided for update'
    })
  },

  // Cancel session validation
  cancelSession: {
    params: Joi.object({
      ticket_id: baseSchemas.ticketId.messages({
        'string.pattern.base': 'Ticket ID must be in format TKT-YYYYMMDD-XXX',
        'any.required': 'Ticket ID is required'
      })
    }).required(),
    body: Joi.object({
      reason: Joi.string().trim().min(10).max(500).required().messages({
        'string.min': 'Cancellation reason must be at least 10 characters long',
        'string.max': 'Cancellation reason must not exceed 500 characters',
        'any.required': 'Cancellation reason is required'
      }),
      refund_amount: baseSchemas.optionalAmount.messages({
        'number.base': 'Refund amount must be a number',
        'number.min': 'Refund amount cannot be negative',
        'number.max': 'Refund amount cannot exceed ₹999,999.99',
        'number.precision': 'Refund amount can have at most 2 decimal places'
      })
    }).required()
  },

  // Extend session validation
  extendSession: {
    params: Joi.object({
      ticket_id: baseSchemas.ticketId.messages({
        'string.pattern.base': 'Ticket ID must be in format TKT-YYYYMMDD-XXX',
        'any.required': 'Ticket ID is required'
      })
    }).required(),
    body: Joi.object({
      extension_hours: Joi.number().precision(2).min(0.5).max(12).required().messages({
        'number.base': 'Extension hours must be a number',
        'number.min': 'Extension must be at least 0.5 hours (30 minutes)',
        'number.max': 'Extension cannot exceed 12 hours',
        'number.precision': 'Extension hours can have at most 2 decimal places',
        'any.required': 'Extension hours are required'
      }),
      payment_method: baseSchemas.paymentMethod.messages({
        'any.only': 'Payment method must be cash, digital, or card',
        'any.required': 'Payment method is required for extension'
      }),
      notes: baseSchemas.notes.messages({
        'string.max': 'Notes must not exceed 1000 characters'
      })
    }).required()
  },

  // Session analytics validation
  getSessionAnalytics: {
    query: Joi.object({
      start_date: baseSchemas.optionalDateString.messages({
        'string.pattern.base': 'Start date must be in YYYY-MM-DD format'
      }),
      end_date: baseSchemas.optionalDateString.messages({
        'string.pattern.base': 'End date must be in YYYY-MM-DD format'
      }),
      lot_id: baseSchemas.optionalObjectId.messages({
        'number.base': 'Lot ID must be a number',
        'number.integer': 'Lot ID must be an integer',
        'number.positive': 'Lot ID must be positive'
      }),
      group_by: Joi.string().valid('day', 'week', 'month').default('day'),
      metrics: Joi.array().items(
        Joi.string().valid('count', 'revenue', 'duration', 'occupancy')
      ).min(1).default(['count', 'revenue']).messages({
        'array.min': 'At least one metric must be specified'
      })
    }).optional()
  }
};

/**
 * Business rule validators for session management
 */
const sessionBusinessRules = {
  // Validate slot availability for check-in
  validateSlotAvailability: (data) => {
    const { body } = data;
    
    if (!body || !body.slot_id || !body.lot_id) {
      return { isValid: true }; // Skip if incomplete data
    }

    const mockDataStore = require('../data/mockData');
    
    // Check if lot exists
    if (!mockDataStore.parkingLots.has(body.lot_id)) {
      return {
        isValid: false,
        field: 'lot_id',
        message: `Parking lot with ID ${body.lot_id} does not exist`
      };
    }

    // Check if slot is already occupied
    for (const [sessionId, session] of mockDataStore.sessions) {
      if (session.parkinglot_id === body.lot_id && 
          session.slot_number === body.slot_id.toString() && 
          session.status === 'active') {
        return {
          isValid: false,
          field: 'slot_id',
          message: `Slot ${body.slot_id} in lot ${body.lot_id} is already occupied`
        };
      }
    }

    return { isValid: true };
  },

  // Validate vehicle registration uniqueness for active sessions
  validateVehicleAvailability: (data) => {
    const { body } = data;
    
    if (!body || !body.vehicle_reg_no) {
      return { isValid: true }; // Skip if no vehicle registration
    }

    const mockDataStore = require('../data/mockData');
    
    // Check if vehicle is already in an active session
    for (const [sessionId, session] of mockDataStore.sessions) {
      if (session.vehicle_reg_no === body.vehicle_reg_no && session.status === 'active') {
        return {
          isValid: false,
          field: 'vehicle_reg_no',
          message: `Vehicle ${body.vehicle_reg_no} is already in an active parking session (Ticket: ${session.ticket_id})`
        };
      }
    }

    return { isValid: true };
  },

  // Validate lot capacity for vehicle type
  validateLotCapacity: (data) => {
    const { body } = data;
    
    if (!body || !body.lot_id || !body.vehicle_type) {
      return { isValid: true }; // Skip if incomplete data
    }

    const mockDataStore = require('../data/mockData');
    const lot = mockDataStore.parkingLots.get(body.lot_id);
    
    if (!lot) {
      return { isValid: true }; // Lot existence is validated elsewhere
    }

    // Count active sessions by vehicle type in this lot
    let activeCarSessions = 0;
    let activeMotorcycleSessions = 0;
    
    for (const [sessionId, session] of mockDataStore.sessions) {
      if (session.parkinglot_id === body.lot_id && session.status === 'active') {
        if (session.vehicle_type === 'car') {
          activeCarSessions++;
        } else if (session.vehicle_type === 'motorcycle') {
          activeMotorcycleSessions++;
        }
      }
    }

    // Check capacity based on vehicle type
    if (body.vehicle_type === 'car' && activeCarSessions >= lot.car_slots) {
      return {
        isValid: false,
        field: 'vehicle_type',
        message: `No car slots available in ${lot.name}. Current occupancy: ${activeCarSessions}/${lot.car_slots}`
      };
    }

    if (body.vehicle_type === 'motorcycle' && activeMotorcycleSessions >= lot.motorcycle_slots) {
      return {
        isValid: false,
        field: 'vehicle_type',
        message: `No motorcycle slots available in ${lot.name}. Current occupancy: ${activeMotorcycleSessions}/${lot.motorcycle_slots}`
      };
    }

    return { isValid: true };
  },

  // Validate session exists for check-out
  validateSessionForCheckout: (data) => {
    const { body } = data;
    
    if (!body || !body.ticket_id) {
      return { isValid: true }; // Skip if no ticket ID
    }

    const mockDataStore = require('../data/mockData');
    let session = null;
    
    // Find session by ticket ID
    for (const [sessionId, sessionData] of mockDataStore.sessions) {
      if (sessionData.ticket_id === body.ticket_id) {
        session = sessionData;
        break;
      }
    }

    if (!session) {
      return {
        isValid: false,
        field: 'ticket_id',
        message: `No session found with ticket ID ${body.ticket_id}`
      };
    }

    if (session.status !== 'active') {
      return {
        isValid: false,
        field: 'ticket_id',
        message: `Session ${body.ticket_id} is not active (current status: ${session.status})`
      };
    }

    return { isValid: true };
  },

  // Validate admin access to lot
  validateAdminLotAccess: (data) => {
    const { body, user } = data;
    
    if (!user || !body || !body.lot_id) {
      return { isValid: true }; // Skip if incomplete data
    }

    // Super admins have access to all lots
    if (user.role === 'super_admin') {
      return { isValid: true };
    }

    // Regular admins can only access their assigned lots
    if (user.role === 'admin') {
      const adminData = user.user_data;
      if (!adminData || !adminData.assigned_lots || !adminData.assigned_lots.includes(body.lot_id)) {
        return {
          isValid: false,
          field: 'lot_id',
          message: `You do not have access to parking lot ${body.lot_id}`
        };
      }
    }

    return { isValid: true };
  },

  // Validate payment amount for check-out
  validatePaymentAmount: (data) => {
    const { body } = data;
    
    if (!body || !body.ticket_id || body.amount_paid === undefined) {
      return { isValid: true }; // Skip if incomplete data
    }

    const mockDataStore = require('../data/mockData');
    let session = null;
    
    // Find session by ticket ID
    for (const [sessionId, sessionData] of mockDataStore.sessions) {
      if (sessionData.ticket_id === body.ticket_id) {
        session = sessionData;
        break;
      }
    }

    if (!session) {
      return { isValid: true }; // Session existence is validated elsewhere
    }

    // Calculate expected amount (this would be more complex in real implementation)
    const expectedAmount = session.amount_due || 0;
    
    if (body.amount_paid < expectedAmount) {
      return {
        isValid: false,
        field: 'amount_paid',
        message: `Payment amount ₹${body.amount_paid} is less than due amount ₹${expectedAmount}`
      };
    }

    return { isValid: true };
  },

  // Validate date range for session queries
  validateSessionDateRange: (data) => {
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

      // Check if date range is not too large (max 3 months for performance)
      const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > 90) {
        return {
          isValid: false,
          field: 'date_range',
          message: 'Date range cannot exceed 90 days'
        };
      }
    }

    return { isValid: true };
  },

  // Validate session extension constraints
  validateSessionExtension: (data) => {
    const { body, params } = data;
    
    if (!body || !params || !params.ticket_id) {
      return { isValid: true }; // Skip if incomplete data
    }

    const mockDataStore = require('../data/mockData');
    let session = null;
    
    // Find session by ticket ID
    for (const [sessionId, sessionData] of mockDataStore.sessions) {
      if (sessionData.ticket_id === params.ticket_id) {
        session = sessionData;
        break;
      }
    }

    if (!session) {
      return { isValid: true }; // Session existence is validated elsewhere
    }

    // Check if session can be extended (not already too long)
    const currentDuration = session.duration_hrs || 0;
    const extensionHours = body.extension_hours || 0;
    const totalDuration = currentDuration + extensionHours;

    if (totalDuration > 24) {
      return {
        isValid: false,
        field: 'extension_hours',
        message: `Total session duration cannot exceed 24 hours. Current: ${currentDuration}h, Extension: ${extensionHours}h`
      };
    }

    return { isValid: true };
  }
};

module.exports = {
  sessionSchemas,
  sessionBusinessRules
};