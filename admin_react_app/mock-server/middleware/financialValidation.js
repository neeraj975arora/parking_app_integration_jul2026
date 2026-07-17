const ValidationMiddleware = require('./validation');
const { financialSchemas, financialBusinessRules } = require('../schemas/financial');

/**
 * Financial and closure validation middleware
 */
class FinancialValidation {
  /**
   * Validate daily closure creation request
   */
  static validateCreateClosure() {
    return [
      ValidationMiddleware.createValidator(financialSchemas.createClosure),
      ValidationMiddleware.createBusinessRuleValidator([
        financialBusinessRules.validateClosureDate,
        financialBusinessRules.validateClosureUniqueness,
        financialBusinessRules.validateAdminLotAccess,
        financialBusinessRules.validateFinancialCalculations
      ])
    ];
  }

  /**
   * Validate closure finalization request
   */
  static validateFinalizeClosure() {
    return [
      ValidationMiddleware.createValidator(financialSchemas.finalizeClosure),
      ValidationMiddleware.createBusinessRuleValidator([
        financialBusinessRules.validateClosureFinalization,
        financialBusinessRules.validateFinancialCalculations
      ])
    ];
  }

  /**
   * Validate get closure request
   */
  static validateGetClosure() {
    return ValidationMiddleware.createValidator(financialSchemas.getClosure);
  }

  /**
   * Validate get closures by date range request
   */
  static validateGetClosuresByDateRange() {
    return [
      ValidationMiddleware.createValidator(financialSchemas.getClosuresByDateRange),
      ValidationMiddleware.createBusinessRuleValidator([
        financialBusinessRules.validateFinancialReportDateRange
      ])
    ];
  }

  /**
   * Validate get total due request
   */
  static validateGetTotalDue() {
    return ValidationMiddleware.createValidator(financialSchemas.getTotalDue);
  }

  /**
   * Validate payment processing request
   */
  static validateProcessPayment() {
    return [
      ValidationMiddleware.createValidator(financialSchemas.processPayment),
      ValidationMiddleware.createBusinessRuleValidator([
        financialBusinessRules.validatePaymentProcessing
      ])
    ];
  }

  /**
   * Validate refund processing request
   */
  static validateProcessRefund() {
    return [
      ValidationMiddleware.createValidator(financialSchemas.processRefund),
      ValidationMiddleware.createBusinessRuleValidator([
        financialBusinessRules.validateRefundProcessing
      ])
    ];
  }

  /**
   * Validate financial report request
   */
  static validateGetFinancialReport() {
    return [
      ValidationMiddleware.createValidator(financialSchemas.getFinancialReport),
      ValidationMiddleware.createBusinessRuleValidator([
        financialBusinessRules.validateFinancialReportDateRange
      ])
    ];
  }

  /**
   * Validate outstanding balance request
   */
  static validateGetOutstandingBalance() {
    return ValidationMiddleware.createValidator(financialSchemas.getOutstandingBalance);
  }

  /**
   * Validate revenue analytics request
   */
  static validateGetRevenueAnalytics() {
    return [
      ValidationMiddleware.createValidator(financialSchemas.getRevenueAnalytics),
      ValidationMiddleware.createBusinessRuleValidator([
        financialBusinessRules.validateFinancialReportDateRange
      ])
    ];
  }

  /**
   * Create validation for financial operations with role-based access
   */
  static validateFinancialAccess() {
    return ValidationMiddleware.createBusinessRuleValidator([
      (data) => {
        const { user } = data;
        
        if (!user) {
          return {
            isValid: false,
            field: 'authentication',
            message: 'Authentication required for financial operations'
          };
        }

        // Only admins and super admins can perform financial operations
        if (user.role !== 'admin' && user.role !== 'super_admin') {
          return {
            isValid: false,
            field: 'role',
            message: 'Only administrators can perform financial operations'
          };
        }

        return { isValid: true };
      }
    ]);
  }

  /**
   * Validate financial data consistency
   */
  static validateFinancialDataConsistency() {
    return ValidationMiddleware.createBusinessRuleValidator([
      (data) => {
        const { body } = data;
        
        if (!body) {
          return { isValid: true };
        }

        // Validate that financial amounts are reasonable
        const amounts = [
          body.opening_balance,
          body.today_collection,
          body.amount_paid,
          body.amount,
          body.refund_amount
        ].filter(amount => amount !== undefined);

        for (const amount of amounts) {
          if (amount < 0) {
            return {
              isValid: false,
              field: 'amount',
              message: 'Financial amounts cannot be negative'
            };
          }

          if (amount > 1000000) {
            return {
              isValid: false,
              field: 'amount',
              message: 'Financial amounts cannot exceed ₹10,00,000 for security reasons'
            };
          }
        }

        return { isValid: true };
      }
    ]);
  }

  /**
   * Create validation for bulk financial operations
   */
  static validateBulkFinancialOperation(operationType) {
    const bulkSchema = {
      body: {
        operation_type: require('joi').string().valid(operationType).required(),
        items: require('joi').array().items(
          require('joi').object({
            id: require('joi').string().required(),
            amount: require('../schemas/base').baseSchemas.amount,
            notes: require('../schemas/base').baseSchemas.notes
          })
        ).min(1).max(100).required().messages({
          'array.min': 'At least one item must be provided',
          'array.max': 'Cannot process more than 100 items at once'
        }),
        total_amount: require('../schemas/base').baseSchemas.amount.required()
      }
    };

    return [
      ValidationMiddleware.createValidator(bulkSchema),
      ValidationMiddleware.createBusinessRuleValidator([
        (data) => {
          const { body } = data;
          
          if (!body || !body.items || !body.total_amount) {
            return { isValid: true };
          }

          // Validate that total amount matches sum of individual amounts
          const calculatedTotal = body.items.reduce((sum, item) => sum + (item.amount || 0), 0);
          const tolerance = 0.01; // 1 paisa tolerance for rounding

          if (Math.abs(calculatedTotal - body.total_amount) > tolerance) {
            return {
              isValid: false,
              field: 'total_amount',
              message: `Total amount ₹${body.total_amount} does not match sum of individual amounts ₹${calculatedTotal}`
            };
          }

          return { isValid: true };
        }
      ])
    ];
  }

  /**
   * Create validation middleware with financial-specific error handling
   */
  static validateWithFinancialErrorHandler(schemas) {
    return ValidationMiddleware.createValidatorWithCustomError(
      schemas,
      FinancialValidation.financialErrorHandler
    );
  }

  /**
   * Custom error handler for financial validation errors
   */
  static financialErrorHandler(errors, req, res, next) {
    const logger = require('../utils/logger');
    
    logger.validationError('Financial operation validation failed', {
      errors,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.user_id,
      userRole: req.user?.role,
      ip: req.ip
    });

    // Check for specific financial-related errors
    const amountError = errors.find(err => 
      err.field?.includes('amount') || err.message?.includes('amount')
    );
    const dateError = errors.find(err => 
      err.field?.includes('date') || err.message?.includes('date')
    );
    const accessError = errors.find(err => 
      err.field === 'role' || err.field === 'authentication'
    );
    const calculationError = errors.find(err => 
      err.message?.includes('calculation') || err.message?.includes('total')
    );

    if (accessError) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        details: {
          message: 'You do not have permission to perform financial operations',
          required_role: 'admin or super_admin',
          current_role: req.user?.role || 'unauthenticated'
        }
      });
    }

    if (calculationError) {
      return res.status(422).json({
        success: false,
        error: 'Financial calculation error',
        details: {
          message: 'Financial calculations do not match expected values',
          errors: errors.filter(err => 
            err.message?.includes('calculation') || err.message?.includes('total')
          )
        }
      });
    }

    if (amountError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid financial amount',
        details: {
          message: 'One or more financial amounts are invalid',
          errors: errors.filter(err => 
            err.field?.includes('amount') || err.message?.includes('amount')
          )
        }
      });
    }

    if (dateError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date range',
        details: {
          message: 'The specified date range is invalid or not allowed',
          errors: errors.filter(err => 
            err.field?.includes('date') || err.message?.includes('date')
          )
        }
      });
    }

    // Standard validation error response
    return res.status(400).json({
      success: false,
      error: 'Financial validation failed',
      details: {
        message: 'One or more validation errors occurred',
        errors: errors
      }
    });
  }

  /**
   * Validate financial audit trail requirements
   */
  static validateFinancialAuditTrail() {
    return ValidationMiddleware.createBusinessRuleValidator([
      (data) => {
        const { body, user } = data;
        
        if (!body || !user) {
          return { isValid: true };
        }

        // Ensure audit information is present for financial operations
        const auditRequiredOperations = [
          'create_closure', 'finalize_closure', 'process_payment', 'process_refund'
        ];

        const operation = body.operation_type || req.route?.path || 'unknown';
        
        if (auditRequiredOperations.some(op => operation.includes(op))) {
          if (!body.notes || body.notes.trim().length < 10) {
            return {
              isValid: false,
              field: 'notes',
              message: 'Detailed notes are required for financial operations (minimum 10 characters)'
            };
          }
        }

        return { isValid: true };
      }
    ]);
  }

  /**
   * Validate financial operation timing constraints
   */
  static validateFinancialOperationTiming() {
    return ValidationMiddleware.createBusinessRuleValidator([
      (data) => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday

        // Financial operations are restricted during certain hours
        const restrictedHours = {
          start: 0,  // 12 AM
          end: 6     // 6 AM
        };

        if (currentHour >= restrictedHours.start && currentHour < restrictedHours.end) {
          return {
            isValid: false,
            field: 'time',
            message: `Financial operations are not allowed between ${restrictedHours.start}:00 AM and ${restrictedHours.end}:00 AM for security reasons`
          };
        }

        // Weekend restrictions for certain operations
        if (currentDay === 0 || currentDay === 6) { // Weekend
          const { body } = data;
          const highValueOperations = ['process_refund', 'bulk_payment'];
          
          if (body && body.amount > 50000) { // High value operations
            return {
              isValid: false,
              field: 'time',
              message: 'High-value financial operations (>₹50,000) are not allowed on weekends'
            };
          }
        }

        return { isValid: true };
      }
    ]);
  }
}

module.exports = FinancialValidation;