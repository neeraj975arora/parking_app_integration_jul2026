const Joi = require('joi');
const { baseSchemas } = require('./base');

/**
 * Financial and closure validation schemas
 */
const financialSchemas = {
  // Daily closure creation validation
  createClosure: {
    body: Joi.object({
      date: baseSchemas.dateString.messages({
        'string.pattern.base': 'Date must be in YYYY-MM-DD format',
        'any.required': 'Date is required for closure creation'
      }),
      admin_id: baseSchemas.objectId.messages({
        'number.base': 'Admin ID must be a number',
        'number.integer': 'Admin ID must be an integer',
        'number.positive': 'Admin ID must be positive',
        'any.required': 'Admin ID is required for closure'
      }),
      parkinglot_ids: baseSchemas.numberArray.min(1).max(10).messages({
        'array.min': 'At least one parking lot must be included in closure',
        'array.max': 'Cannot include more than 10 parking lots in a single closure',
        'any.required': 'Parking lot IDs are required for closure'
      }),
      opening_balance: baseSchemas.amount.messages({
        'number.base': 'Opening balance must be a number',
        'number.min': 'Opening balance cannot be negative',
        'number.max': 'Opening balance cannot exceed ₹999,999.99',
        'number.precision': 'Opening balance can have at most 2 decimal places',
        'any.required': 'Opening balance is required'
      }),
      today_collection: baseSchemas.amount.messages({
        'number.base': 'Today collection must be a number',
        'number.min': 'Today collection cannot be negative',
        'number.max': 'Today collection cannot exceed ₹999,999.99',
        'number.precision': 'Today collection can have at most 2 decimal places',
        'any.required': 'Today collection amount is required'
      }),
      amount_paid: baseSchemas.amount.messages({
        'number.base': 'Amount paid must be a number',
        'number.min': 'Amount paid cannot be negative',
        'number.max': 'Amount paid cannot exceed ₹999,999.99',
        'number.precision': 'Amount paid can have at most 2 decimal places',
        'any.required': 'Amount paid is required'
      }),
      notes: baseSchemas.notes.messages({
        'string.max': 'Notes must not exceed 1000 characters'
      })
    }).required()
  },

  // Finalize closure validation
  finalizeClosure: {
    params: Joi.object({
      closure_id: baseSchemas.closureId.messages({
        'string.pattern.base': 'Closure ID must be in format CLS-YYYYMMDD',
        'any.required': 'Closure ID is required'
      })
    }).required(),
    body: Joi.object({
      amount_paid: baseSchemas.amount.messages({
        'number.base': 'Amount paid must be a number',
        'number.min': 'Amount paid cannot be negative',
        'number.max': 'Amount paid cannot exceed ₹999,999.99',
        'number.precision': 'Amount paid can have at most 2 decimal places',
        'any.required': 'Amount paid is required for finalization'
      }),
      payment_method: baseSchemas.paymentMethod.messages({
        'any.only': 'Payment method must be cash, digital, or card',
        'any.required': 'Payment method is required for finalization'
      }),
      notes: baseSchemas.notes.messages({
        'string.max': 'Notes must not exceed 1000 characters'
      })
    }).required()
  },

  // Get closure details validation
  getClosure: {
    params: Joi.object({
      closure_id: baseSchemas.closureId.messages({
        'string.pattern.base': 'Closure ID must be in format CLS-YYYYMMDD',
        'any.required': 'Closure ID is required'
      })
    }).required()
  },

  // Get closures by date range validation
  getClosuresByDateRange: {
    query: Joi.object({
      start_date: baseSchemas.dateString.messages({
        'string.pattern.base': 'Start date must be in YYYY-MM-DD format',
        'any.required': 'Start date is required'
      }),
      end_date: baseSchemas.dateString.messages({
        'string.pattern.base': 'End date must be in YYYY-MM-DD format',
        'any.required': 'End date is required'
      }),
      admin_id: baseSchemas.optionalObjectId.messages({
        'number.base': 'Admin ID must be a number',
        'number.integer': 'Admin ID must be an integer',
        'number.positive': 'Admin ID must be positive'
      }),
      lot_id: baseSchemas.optionalObjectId.messages({
        'number.base': 'Lot ID must be a number',
        'number.integer': 'Lot ID must be an integer',
        'number.positive': 'Lot ID must be positive'
      }),
      status: baseSchemas.optionalClosureStatus.messages({
        'any.only': 'Status must be pending or completed'
      }),
      page: baseSchemas.page,
      limit: baseSchemas.limit,
      sort_by: Joi.string().valid('date', 'total_due', 'amount_paid', 'new_outstanding').default('date'),
      sort_order: baseSchemas.sortOrder
    }).required()
  },

  // Get total due validation
  getTotalDue: {
    query: Joi.object({
      admin_id: baseSchemas.optionalObjectId.messages({
        'number.base': 'Admin ID must be a number',
        'number.integer': 'Admin ID must be an integer',
        'number.positive': 'Admin ID must be positive'
      }),
      date: baseSchemas.optionalDateString.messages({
        'string.pattern.base': 'Date must be in YYYY-MM-DD format'
      }),
      lot_ids: Joi.alternatives().try(
        baseSchemas.optionalNumberArray,
        Joi.string().pattern(/^\d+(,\d+)*$/).custom((value) => {
          return value.split(',').map(id => parseInt(id.trim()));
        })
      ).messages({
        'alternatives.match': 'Lot IDs must be an array of numbers or comma-separated string'
      })
    }).optional()
  },

  // Payment processing validation
  processPayment: {
    body: Joi.object({
      session_id: baseSchemas.ticketId.messages({
        'string.pattern.base': 'Session ID must be in format TKT-YYYYMMDD-XXX',
        'any.required': 'Session ID is required for payment processing'
      }),
      amount: baseSchemas.amount.messages({
        'number.base': 'Payment amount must be a number',
        'number.min': 'Payment amount cannot be negative',
        'number.max': 'Payment amount cannot exceed ₹999,999.99',
        'number.precision': 'Payment amount can have at most 2 decimal places',
        'any.required': 'Payment amount is required'
      }),
      payment_method: baseSchemas.paymentMethod.messages({
        'any.only': 'Payment method must be cash, digital, or card',
        'any.required': 'Payment method is required'
      }),
      transaction_id: Joi.string().trim().min(5).max(100).optional().messages({
        'string.min': 'Transaction ID must be at least 5 characters long',
        'string.max': 'Transaction ID must not exceed 100 characters'
      }),
      gateway_response: Joi.object({
        gateway: Joi.string().valid('razorpay', 'paytm', 'phonepe', 'gpay').optional(),
        gateway_transaction_id: Joi.string().trim().min(5).max(100).optional(),
        status: Joi.string().valid('captured', 'failed', 'pending').optional()
      }).optional()
    }).required()
  },

  // Refund processing validation
  processRefund: {
    body: Joi.object({
      payment_id: baseSchemas.paymentId.messages({
        'string.pattern.base': 'Payment ID must be in format PAY-YYYYMMDD-XXX',
        'any.required': 'Payment ID is required for refund processing'
      }),
      refund_amount: baseSchemas.amount.messages({
        'number.base': 'Refund amount must be a number',
        'number.min': 'Refund amount cannot be negative',
        'number.max': 'Refund amount cannot exceed ₹999,999.99',
        'number.precision': 'Refund amount can have at most 2 decimal places',
        'any.required': 'Refund amount is required'
      }),
      reason: Joi.string().trim().min(10).max(500).required().messages({
        'string.min': 'Refund reason must be at least 10 characters long',
        'string.max': 'Refund reason must not exceed 500 characters',
        'any.required': 'Refund reason is required'
      }),
      refund_method: baseSchemas.paymentMethod.messages({
        'any.only': 'Refund method must be cash, digital, or card',
        'any.required': 'Refund method is required'
      })
    }).required()
  },

  // Financial report validation
  getFinancialReport: {
    query: Joi.object({
      start_date: baseSchemas.dateString.messages({
        'string.pattern.base': 'Start date must be in YYYY-MM-DD format',
        'any.required': 'Start date is required for financial report'
      }),
      end_date: baseSchemas.dateString.messages({
        'string.pattern.base': 'End date must be in YYYY-MM-DD format',
        'any.required': 'End date is required for financial report'
      }),
      admin_id: baseSchemas.optionalObjectId.messages({
        'number.base': 'Admin ID must be a number',
        'number.integer': 'Admin ID must be an integer',
        'number.positive': 'Admin ID must be positive'
      }),
      lot_ids: Joi.alternatives().try(
        baseSchemas.optionalNumberArray,
        Joi.string().pattern(/^\d+(,\d+)*$/).custom((value) => {
          return value.split(',').map(id => parseInt(id.trim()));
        })
      ).messages({
        'alternatives.match': 'Lot IDs must be an array of numbers or comma-separated string'
      }),
      report_type: Joi.string().valid('summary', 'detailed', 'analytics').default('summary'),
      group_by: Joi.string().valid('day', 'week', 'month', 'lot', 'admin').default('day'),
      include_metrics: Joi.array().items(
        Joi.string().valid('revenue', 'sessions', 'occupancy', 'payments', 'refunds')
      ).min(1).default(['revenue', 'sessions']).messages({
        'array.min': 'At least one metric must be included in the report'
      })
    }).required()
  },

  // Outstanding balance validation
  getOutstandingBalance: {
    query: Joi.object({
      admin_id: baseSchemas.optionalObjectId.messages({
        'number.base': 'Admin ID must be a number',
        'number.integer': 'Admin ID must be an integer',
        'number.positive': 'Admin ID must be positive'
      }),
      lot_ids: Joi.alternatives().try(
        baseSchemas.optionalNumberArray,
        Joi.string().pattern(/^\d+(,\d+)*$/).custom((value) => {
          return value.split(',').map(id => parseInt(id.trim()));
        })
      ).messages({
        'alternatives.match': 'Lot IDs must be an array of numbers or comma-separated string'
      }),
      as_of_date: baseSchemas.optionalDateString.messages({
        'string.pattern.base': 'As of date must be in YYYY-MM-DD format'
      })
    }).optional()
  },

  // Revenue analytics validation
  getRevenueAnalytics: {
    query: Joi.object({
      start_date: baseSchemas.dateString.messages({
        'string.pattern.base': 'Start date must be in YYYY-MM-DD format',
        'any.required': 'Start date is required for revenue analytics'
      }),
      end_date: baseSchemas.dateString.messages({
        'string.pattern.base': 'End date must be in YYYY-MM-DD format',
        'any.required': 'End date is required for revenue analytics'
      }),
      lot_ids: Joi.alternatives().try(
        baseSchemas.optionalNumberArray,
        Joi.string().pattern(/^\d+(,\d+)*$/).custom((value) => {
          return value.split(',').map(id => parseInt(id.trim()));
        })
      ).messages({
        'alternatives.match': 'Lot IDs must be an array of numbers or comma-separated string'
      }),
      granularity: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').default('daily'),
      metrics: Joi.array().items(
        Joi.string().valid('gross_revenue', 'net_revenue', 'average_session_value', 'peak_hours', 'occupancy_rate')
      ).min(1).default(['gross_revenue', 'net_revenue']).messages({
        'array.min': 'At least one metric must be specified'
      }),
      compare_with: Joi.string().valid('previous_period', 'same_period_last_year').optional()
    }).required()
  }
};

/**
 * Business rule validators for financial operations
 */
const financialBusinessRules = {
  // Validate closure date constraints
  validateClosureDate: (data) => {
    const { body } = data;
    
    if (!body || !body.date) {
      return { isValid: true }; // Skip if no date
    }

    const closureDate = new Date(body.date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Cannot create closure for future dates
    if (closureDate > today) {
      return {
        isValid: false,
        field: 'date',
        message: 'Cannot create closure for future dates'
      };
    }

    // Cannot create closure for dates more than 7 days old
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (closureDate < sevenDaysAgo) {
      return {
        isValid: false,
        field: 'date',
        message: 'Cannot create closure for dates older than 7 days'
      };
    }

    return { isValid: true };
  },

  // Validate closure already exists for date
  validateClosureUniqueness: (data) => {
    const { body } = data;
    
    if (!body || !body.date || !body.admin_id) {
      return { isValid: true }; // Skip if incomplete data
    }

    const mockDataStore = require('../data/mockData');
    const closureId = `CLS-${body.date.replace(/-/g, '')}`;
    
    // Check if closure already exists for this date and admin
    for (const [id, closure] of mockDataStore.closures) {
      if (closure.date === body.date && closure.admin_id === body.admin_id) {
        return {
          isValid: false,
          field: 'date',
          message: `Closure already exists for date ${body.date} and admin ${body.admin_id}`
        };
      }
    }

    return { isValid: true };
  },

  // Validate admin has access to specified lots
  validateAdminLotAccess: (data) => {
    const { body, user } = data;
    
    if (!body || !body.parkinglot_ids || !user) {
      return { isValid: true }; // Skip if incomplete data
    }

    // Super admins have access to all lots
    if (user.role === 'super_admin') {
      return { isValid: true };
    }

    // Regular admins can only create closures for their assigned lots
    if (user.role === 'admin') {
      const adminData = user.user_data;
      if (!adminData || !adminData.assigned_lots) {
        return {
          isValid: false,
          field: 'parkinglot_ids',
          message: 'Admin has no assigned parking lots'
        };
      }

      for (const lotId of body.parkinglot_ids) {
        if (!adminData.assigned_lots.includes(lotId)) {
          return {
            isValid: false,
            field: 'parkinglot_ids',
            message: `You do not have access to parking lot ${lotId}`
          };
        }
      }
    }

    return { isValid: true };
  },

  // Validate financial calculations
  validateFinancialCalculations: (data) => {
    const { body } = data;
    
    if (!body || body.opening_balance === undefined || body.today_collection === undefined || body.amount_paid === undefined) {
      return { isValid: true }; // Skip if incomplete data
    }

    const totalDue = body.opening_balance + body.today_collection;
    const newOutstanding = totalDue - body.amount_paid;

    // Validate that amount paid doesn't exceed total due by more than 10% (for overpayment tolerance)
    if (body.amount_paid > totalDue * 1.1) {
      return {
        isValid: false,
        field: 'amount_paid',
        message: `Amount paid (₹${body.amount_paid}) significantly exceeds total due (₹${totalDue}). Please verify the amount.`
      };
    }

    // Validate that new outstanding is reasonable
    if (newOutstanding < 0 && Math.abs(newOutstanding) > totalDue * 0.1) {
      return {
        isValid: false,
        field: 'amount_paid',
        message: `Overpayment of ₹${Math.abs(newOutstanding)} is too large. Please verify the amount.`
      };
    }

    return { isValid: true };
  },

  // Validate payment processing constraints
  validatePaymentProcessing: (data) => {
    const { body } = data;
    
    if (!body || !body.session_id) {
      return { isValid: true }; // Skip if no session ID
    }

    const mockDataStore = require('../data/mockData');
    let session = null;
    
    // Find session by ticket ID
    for (const [sessionId, sessionData] of mockDataStore.sessions) {
      if (sessionData.ticket_id === body.session_id) {
        session = sessionData;
        break;
      }
    }

    if (!session) {
      return {
        isValid: false,
        field: 'session_id',
        message: `No session found with ID ${body.session_id}`
      };
    }

    // Check if payment already processed
    if (session.payment_status === 'completed') {
      return {
        isValid: false,
        field: 'session_id',
        message: `Payment already completed for session ${body.session_id}`
      };
    }

    // Validate payment amount against session amount due
    if (body.amount && session.amount_due && body.amount < session.amount_due) {
      return {
        isValid: false,
        field: 'amount',
        message: `Payment amount ₹${body.amount} is less than due amount ₹${session.amount_due}`
      };
    }

    return { isValid: true };
  },

  // Validate refund processing constraints
  validateRefundProcessing: (data) => {
    const { body } = data;
    
    if (!body || !body.payment_id) {
      return { isValid: true }; // Skip if no payment ID
    }

    const mockDataStore = require('../data/mockData');
    let payment = null;
    
    // Find payment by payment ID
    for (const [paymentId, paymentData] of mockDataStore.payments) {
      if (paymentData.payment_id === body.payment_id) {
        payment = paymentData;
        break;
      }
    }

    if (!payment) {
      return {
        isValid: false,
        field: 'payment_id',
        message: `No payment found with ID ${body.payment_id}`
      };
    }

    // Check if payment is eligible for refund
    if (payment.status !== 'completed') {
      return {
        isValid: false,
        field: 'payment_id',
        message: `Payment ${body.payment_id} is not completed and cannot be refunded`
      };
    }

    // Validate refund amount
    if (body.refund_amount > payment.amount) {
      return {
        isValid: false,
        field: 'refund_amount',
        message: `Refund amount ₹${body.refund_amount} cannot exceed original payment amount ₹${payment.amount}`
      };
    }

    return { isValid: true };
  },

  // Validate date range for financial reports
  validateFinancialReportDateRange: (data) => {
    const { query } = data;
    
    if (!query || !query.start_date || !query.end_date) {
      return { isValid: true }; // Skip if no date range
    }

    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);
    
    if (startDate > endDate) {
      return {
        isValid: false,
        field: 'date_range',
        message: 'Start date cannot be later than end date'
      };
    }

    // Check if date range is not too large (max 1 year for performance)
    const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      return {
        isValid: false,
        field: 'date_range',
        message: 'Date range cannot exceed 365 days for financial reports'
      };
    }

    return { isValid: true };
  },

  // Validate closure finalization constraints
  validateClosureFinalization: (data) => {
    const { params, body } = data;
    
    if (!params || !params.closure_id) {
      return { isValid: true }; // Skip if no closure ID
    }

    const mockDataStore = require('../data/mockData');
    let closure = null;
    
    // Find closure by closure ID
    for (const [closureId, closureData] of mockDataStore.closures) {
      if (closureData.closure_id === params.closure_id) {
        closure = closureData;
        break;
      }
    }

    if (!closure) {
      return {
        isValid: false,
        field: 'closure_id',
        message: `No closure found with ID ${params.closure_id}`
      };
    }

    // Check if closure is already finalized
    if (closure.status === 'completed') {
      return {
        isValid: false,
        field: 'closure_id',
        message: `Closure ${params.closure_id} is already finalized`
      };
    }

    return { isValid: true };
  }
};

module.exports = {
  financialSchemas,
  financialBusinessRules
};