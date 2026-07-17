const Joi = require('joi');

// Base validation schemas for common data types
const baseSchemas = {
  // ObjectId-like validation (for user_id, lot_id, etc.)
  objectId: Joi.number().integer().positive().required(),
  optionalObjectId: Joi.number().integer().positive().optional(),

  // Email validation
  email: Joi.string().email().lowercase().trim().required(),
  optionalEmail: Joi.string().email().lowercase().trim().optional(),

  // Phone number validation (Indian format)
  phoneNumber: Joi.string()
    .pattern(/^(\+91[-\s]?)?[0]?(91)?[6789]\d{9}$/)
    .message('Phone number must be a valid Indian mobile number')
    .required(),
  optionalPhoneNumber: Joi.string()
    .pattern(/^(\+91[-\s]?)?[0]?(91)?[6789]\d{9}$/)
    .message('Phone number must be a valid Indian mobile number')
    .optional(),

  // Password validation
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain at least 8 characters with uppercase, lowercase, number and special character')
    .required(),
  optionalPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain at least 8 characters with uppercase, lowercase, number and special character')
    .optional(),

  // Date validation
  date: Joi.date().iso().required(),
  optionalDate: Joi.date().iso().optional(),
  dateString: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  optionalDateString: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),

  // Time validation (HH:MM format)
  time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  optionalTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),

  // Currency amount validation (Indian Rupees)
  amount: Joi.number().precision(2).min(0).max(999999.99).required(),
  optionalAmount: Joi.number().precision(2).min(0).max(999999.99).optional(),

  // Vehicle registration number validation (Indian format)
  vehicleRegNo: Joi.string()
    .pattern(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{1,4}$/)
    .uppercase()
    .trim()
    .message('Vehicle registration number must be in valid Indian format (e.g., DL01AB1234)')
    .required(),
  optionalVehicleRegNo: Joi.string()
    .pattern(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{1,4}$/)
    .uppercase()
    .trim()
    .message('Vehicle registration number must be in valid Indian format (e.g., DL01AB1234)')
    .optional(),

  // Name validation
  name: Joi.string().trim().min(2).max(100).required(),
  optionalName: Joi.string().trim().min(2).max(100).optional(),

  // Address validation
  address: Joi.string().trim().min(10).max(500).required(),
  optionalAddress: Joi.string().trim().min(10).max(500).optional(),

  // Role validation
  role: Joi.string().valid('super_admin', 'admin', 'user').required(),
  optionalRole: Joi.string().valid('super_admin', 'admin', 'user').optional(),

  // Vehicle type validation
  vehicleType: Joi.string().valid('car', 'motorcycle').required(),
  optionalVehicleType: Joi.string().valid('car', 'motorcycle').optional(),

  // Payment status validation
  paymentStatus: Joi.string().valid('pending', 'completed', 'failed', 'refunded').required(),
  optionalPaymentStatus: Joi.string().valid('pending', 'completed', 'failed', 'refunded').optional(),

  // Payment method validation
  paymentMethod: Joi.string().valid('cash', 'digital', 'card').required(),
  optionalPaymentMethod: Joi.string().valid('cash', 'digital', 'card').optional(),

  // Session status validation
  sessionStatus: Joi.string().valid('active', 'completed', 'cancelled').required(),
  optionalSessionStatus: Joi.string().valid('active', 'completed', 'cancelled').optional(),

  // Closure status validation
  closureStatus: Joi.string().valid('pending', 'completed').required(),
  optionalClosureStatus: Joi.string().valid('pending', 'completed').optional(),

  // Pagination validation
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),

  // Sorting validation
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),

  // Search validation
  search: Joi.string().trim().min(1).max(100).optional(),

  // Boolean validation
  boolean: Joi.boolean().required(),
  optionalBoolean: Joi.boolean().optional(),

  // Array validation
  numberArray: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  optionalNumberArray: Joi.array().items(Joi.number().integer().positive()).min(1).optional(),
  stringArray: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  optionalStringArray: Joi.array().items(Joi.string().trim().min(1)).min(1).optional(),

  // Coordinates validation
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  optionalLatitude: Joi.number().min(-90).max(90).optional(),
  optionalLongitude: Joi.number().min(-180).max(180).optional(),

  // Duration validation (in hours)
  duration: Joi.number().precision(2).min(0.1).max(24).required(),
  optionalDuration: Joi.number().precision(2).min(0.1).max(24).optional(),

  // Slot number validation
  slotNumber: Joi.string().trim().min(1).max(20).required(),
  optionalSlotNumber: Joi.string().trim().min(1).max(20).optional(),

  // Ticket ID validation
  ticketId: Joi.string().pattern(/^TKT-\d{8}-\d{3}$/).required(),
  optionalTicketId: Joi.string().pattern(/^TKT-\d{8}-\d{3}$/).optional(),

  // Payment ID validation
  paymentId: Joi.string().pattern(/^PAY-\d{8}-\d{3}$/).required(),
  optionalPaymentId: Joi.string().pattern(/^PAY-\d{8}-\d{3}$/).optional(),

  // Closure ID validation
  closureId: Joi.string().pattern(/^CLS-\d{8}$/).required(),
  optionalClosureId: Joi.string().pattern(/^CLS-\d{8}$/).optional(),

  // Notes validation
  notes: Joi.string().trim().max(1000).optional(),

  // URL validation
  url: Joi.string().uri().optional(),

  // JWT token validation
  jwtToken: Joi.string().pattern(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/).required(),
  optionalJwtToken: Joi.string().pattern(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/).optional()
};

// Common validation options
const validationOptions = {
  // Abort early on first validation error
  abortEarly: false,
  
  // Allow unknown keys in objects (will be stripped)
  allowUnknown: false,
  
  // Strip unknown keys from objects
  stripUnknown: true,
  
  // Convert values to appropriate types
  convert: true,
  
  // Provide detailed error messages
  errors: {
    wrap: {
      label: '"'
    }
  }
};

// Custom validation messages
const customMessages = {
  'any.required': '{#label} is required',
  'any.empty': '{#label} cannot be empty',
  'string.base': '{#label} must be a string',
  'string.empty': '{#label} cannot be empty',
  'string.min': '{#label} must be at least {#limit} characters long',
  'string.max': '{#label} must not exceed {#limit} characters',
  'string.email': '{#label} must be a valid email address',
  'string.pattern.base': '{#label} format is invalid',
  'number.base': '{#label} must be a number',
  'number.integer': '{#label} must be an integer',
  'number.positive': '{#label} must be a positive number',
  'number.min': '{#label} must be at least {#limit}',
  'number.max': '{#label} must not exceed {#limit}',
  'number.precision': '{#label} must have at most {#limit} decimal places',
  'date.base': '{#label} must be a valid date',
  'date.iso': '{#label} must be in ISO 8601 format',
  'boolean.base': '{#label} must be a boolean',
  'array.base': '{#label} must be an array',
  'array.min': '{#label} must contain at least {#limit} items',
  'array.max': '{#label} must not contain more than {#limit} items',
  'object.base': '{#label} must be an object',
  'any.only': '{#label} must be one of {#valids}'
};

module.exports = {
  baseSchemas,
  validationOptions,
  customMessages
};