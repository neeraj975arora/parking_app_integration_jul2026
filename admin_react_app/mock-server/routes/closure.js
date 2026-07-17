const express = require('express');
const Joi = require('joi');
const logger = require('../utils/logger');
const mockDataStore = require('../data/mockData');
const { authenticateToken, requireAdmin, requireAdminAccess } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const finalizeClosure = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
    'any.required': 'Date is required'
  }),
  amount_paid: Joi.number().min(0).required().messages({
    'number.min': 'Amount paid must be non-negative',
    'any.required': 'Amount paid is required'
  }),
  notes: Joi.string().max(500).optional().default('')
});

const closureSchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
    'any.required': 'Date is required'
  }),
  admin_id: Joi.number().integer().positive().optional(),
  amount_paid: Joi.number().min(0).optional(),
  notes: Joi.string().max(500).optional()
});

// Helper function to calculate today's collection for an admin
const calculateTodayCollection = (adminId, date) => {
  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  // Get admin's assigned lots
  const adminAssignment = mockDataStore.adminLotAssignments.get(adminId);
  if (!adminAssignment) {
    return { totalCollection: 0, sessionCount: 0, completedSessions: 0, pendingSessions: 0 };
  }

  const assignedLotIds = adminAssignment.assigned_lots.map(lot => lot.parkinglot_id);

  // Get all payments for sessions in assigned lots for the date
  const payments = Array.from(mockDataStore.payments.values()).filter(payment => {
    const paymentDate = new Date(payment.payment_timestamp || payment.created_at);
    return paymentDate >= startOfDay && 
           paymentDate <= endOfDay && 
           assignedLotIds.includes(payment.parkinglot_id) &&
           payment.payment_status === 'success';
  });

  // Get session statistics
  const sessions = Array.from(mockDataStore.sessions.values()).filter(session => {
    const sessionDate = new Date(session.start_time);
    return sessionDate >= startOfDay && 
           sessionDate <= endOfDay && 
           assignedLotIds.includes(session.parkinglot_id);
  });

  const completedSessions = sessions.filter(s => s.end_time).length;
  const pendingSessions = sessions.filter(s => !s.end_time).length;

  return {
    totalCollection: payments.reduce((sum, payment) => sum + payment.amount, 0),
    sessionCount: sessions.length,
    completedSessions,
    pendingSessions,
    assignedLots: assignedLotIds
  };
};

// Helper function to get previous day's outstanding amount
const getPreviousOutstanding = (adminId, date) => {
  const targetDate = new Date(date);
  const previousDate = new Date(targetDate);
  previousDate.setDate(previousDate.getDate() - 1);
  const previousDateStr = previousDate.toISOString().split('T')[0];

  // Check if there's a closure record for the previous day
  const previousClosure = Array.from(mockDataStore.closures.values()).find(closure => 
    closure.admin_id === adminId && closure.date === previousDateStr
  );

  return previousClosure ? previousClosure.new_outstanding : 0;
};

// Helper function to generate closure ID
const generateClosureId = (date, adminId) => {
  return `CLS-${date.replace(/-/g, '')}-${String(adminId).padStart(3, '0')}`;
};

// Helper function to validate closure business rules
const validateClosureBusinessRules = (adminId, date, amountPaid, totalDue) => {
  const errors = [];

  // Check if date is not in the future
  const targetDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (targetDate > today) {
    errors.push('Cannot create closure for future dates');
  }

  // Check if amount paid is not greater than total due
  if (amountPaid > totalDue) {
    errors.push(`Amount paid (₹${amountPaid}) cannot exceed total due (₹${totalDue})`);
  }

  // Check if admin has any sessions for the date
  const adminAssignment = mockDataStore.adminLotAssignments.get(adminId);
  if (!adminAssignment || adminAssignment.assigned_lots.length === 0) {
    errors.push('Admin has no assigned parking lots');
  }

  return errors;
};

// Helper function to calculate detailed financial breakdown
const calculateDetailedFinancials = (adminId, date) => {
  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  const adminAssignment = mockDataStore.adminLotAssignments.get(adminId);
  if (!adminAssignment) {
    return null;
  }

  const assignedLotIds = adminAssignment.assigned_lots.map(lot => lot.parkinglot_id);

  // Get all payments for the date
  const payments = Array.from(mockDataStore.payments.values()).filter(payment => {
    const paymentDate = new Date(payment.payment_timestamp || payment.created_at);
    return paymentDate >= startOfDay && 
           paymentDate <= endOfDay && 
           assignedLotIds.includes(payment.parkinglot_id);
  });

  // Get all sessions for the date
  const sessions = Array.from(mockDataStore.sessions.values()).filter(session => {
    const sessionDate = new Date(session.start_time);
    return sessionDate >= startOfDay && 
           sessionDate <= endOfDay && 
           assignedLotIds.includes(session.parkinglot_id);
  });

  // Calculate payment method breakdown
  const paymentMethodBreakdown = {};
  const successfulPayments = payments.filter(p => p.payment_status === 'success');
  
  successfulPayments.forEach(payment => {
    if (!paymentMethodBreakdown[payment.payment_method]) {
      paymentMethodBreakdown[payment.payment_method] = {
        count: 0,
        amount: 0,
        processing_fees: 0
      };
    }
    paymentMethodBreakdown[payment.payment_method].count++;
    paymentMethodBreakdown[payment.payment_method].amount += payment.amount;
    paymentMethodBreakdown[payment.payment_method].processing_fees += payment.processing_fee || 0;
  });

  // Calculate vehicle type breakdown
  const vehicleTypeBreakdown = {};
  sessions.forEach(session => {
    if (!vehicleTypeBreakdown[session.vehicle_type]) {
      vehicleTypeBreakdown[session.vehicle_type] = {
        count: 0,
        revenue: 0,
        avg_duration: 0
      };
    }
    vehicleTypeBreakdown[session.vehicle_type].count++;
    if (session.total_amount) {
      vehicleTypeBreakdown[session.vehicle_type].revenue += session.total_amount;
    }
  });

  // Calculate average duration for each vehicle type
  Object.keys(vehicleTypeBreakdown).forEach(vehicleType => {
    const vehicleSessions = sessions.filter(s => s.vehicle_type === vehicleType && s.duration_hrs);
    const totalDuration = vehicleSessions.reduce((sum, s) => sum + s.duration_hrs, 0);
    vehicleTypeBreakdown[vehicleType].avg_duration = vehicleSessions.length > 0 ? 
      Math.round((totalDuration / vehicleSessions.length) * 100) / 100 : 0;
  });

  // Calculate hourly revenue distribution
  const hourlyRevenue = {};
  for (let hour = 0; hour < 24; hour++) {
    hourlyRevenue[hour] = 0;
  }

  successfulPayments.forEach(payment => {
    const paymentHour = new Date(payment.payment_timestamp || payment.created_at).getHours();
    hourlyRevenue[paymentHour] += payment.amount;
  });

  // Calculate lot-wise breakdown
  const lotWiseBreakdown = {};
  assignedLotIds.forEach(lotId => {
    const lotSessions = sessions.filter(s => s.parkinglot_id === lotId);
    const lotPayments = payments.filter(p => p.parkinglot_id === lotId && p.payment_status === 'success');
    
    const parkingLot = mockDataStore.parkingLots.get(lotId);
    lotWiseBreakdown[lotId] = {
      lot_name: parkingLot?.name || `Parking Lot ${lotId}`,
      total_sessions: lotSessions.length,
      completed_sessions: lotSessions.filter(s => s.end_time).length,
      active_sessions: lotSessions.filter(s => !s.end_time).length,
      total_revenue: lotPayments.reduce((sum, p) => sum + p.amount, 0),
      occupancy_rate: parkingLot ? 
        Math.round((lotSessions.filter(s => !s.end_time).length / parkingLot.total_slots) * 100) : 0
    };
  });

  return {
    total_collection: successfulPayments.reduce((sum, p) => sum + p.amount, 0),
    total_processing_fees: successfulPayments.reduce((sum, p) => sum + (p.processing_fee || 0), 0),
    net_collection: successfulPayments.reduce((sum, p) => sum + p.net_amount, 0),
    payment_method_breakdown: paymentMethodBreakdown,
    vehicle_type_breakdown: vehicleTypeBreakdown,
    hourly_revenue: hourlyRevenue,
    lot_wise_breakdown: lotWiseBreakdown,
    session_statistics: {
      total_sessions: sessions.length,
      completed_sessions: sessions.filter(s => s.end_time).length,
      active_sessions: sessions.filter(s => !s.end_time).length,
      pending_payments: payments.filter(p => p.payment_status === 'pending').length,
      failed_payments: payments.filter(p => p.payment_status === 'failed').length
    }
  };
};

// Helper function to calculate carry-forward outstanding amounts
const calculateCarryForwardOutstanding = (adminId, fromDate, toDate) => {
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  let totalOutstanding = 0;
  
  // Get all closure records for the admin between the dates
  const closures = Array.from(mockDataStore.closures.values()).filter(closure => {
    const closureDate = new Date(closure.date);
    return closure.admin_id === adminId && 
           closureDate >= startDate && 
           closureDate <= endDate;
  });

  // Calculate cumulative outstanding
  closures.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  closures.forEach(closure => {
    totalOutstanding += closure.new_outstanding;
  });

  return {
    total_outstanding: totalOutstanding,
    closure_count: closures.length,
    avg_outstanding: closures.length > 0 ? totalOutstanding / closures.length : 0
  };
};

// Helper function to validate closure amount against business rules
const validateClosureAmount = (totalDue, amountPaid, adminId, date) => {
  const validationResult = {
    isValid: true,
    warnings: [],
    errors: []
  };

  // Check for overpayment
  if (amountPaid > totalDue) {
    validationResult.errors.push(`Amount paid (₹${amountPaid}) exceeds total due (₹${totalDue})`);
    validationResult.isValid = false;
  }

  // Check for significant underpayment (more than 10% of total due)
  const underpaymentThreshold = totalDue * 0.1;
  const shortfall = totalDue - amountPaid;
  
  if (shortfall > underpaymentThreshold && shortfall > 100) { // Only warn if shortfall > ₹100
    validationResult.warnings.push(`Significant underpayment detected. Shortfall: ₹${shortfall.toFixed(2)}`);
  }

  // Check for exact payment (good practice)
  if (amountPaid === totalDue) {
    validationResult.warnings.push('Full payment received - excellent!');
  }

  // Check for partial payment pattern (if admin frequently makes partial payments)
  const recentClosures = Array.from(mockDataStore.closures.values())
    .filter(closure => closure.admin_id === adminId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5); // Last 5 closures

  const partialPayments = recentClosures.filter(closure => closure.new_outstanding > 0).length;
  if (partialPayments >= 3 && shortfall > 0) {
    validationResult.warnings.push('Pattern of partial payments detected. Consider full settlement.');
  }

  return validationResult;
};

// Helper function for date-based closure record management
const getClosureRecordsByDateRange = (adminId, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return Array.from(mockDataStore.closures.values())
    .filter(closure => {
      const closureDate = new Date(closure.date);
      return closure.admin_id === adminId && 
             closureDate >= start && 
             closureDate <= end;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Helper function to validate closure operation permissions
const validateClosurePermissions = (requestingUser, targetAdminId, operation) => {
  const permissionResult = {
    hasPermission: false,
    reason: ''
  };

  // Super admin can perform any operation on any admin's closure
  if (requestingUser.role === 'super_admin') {
    permissionResult.hasPermission = true;
    return permissionResult;
  }

  // Admin can only manage their own closures
  if (requestingUser.role === 'admin' && requestingUser.user_id === targetAdminId) {
    permissionResult.hasPermission = true;
    return permissionResult;
  }

  // Check if admin is trying to access another admin's data
  if (requestingUser.role === 'admin' && requestingUser.user_id !== targetAdminId) {
    permissionResult.reason = 'You can only manage your own closure records';
    return permissionResult;
  }

  permissionResult.reason = 'Insufficient permissions for this operation';
  return permissionResult;
};

// Helper function to validate closure date constraints
const validateClosureDateConstraints = (date, adminId) => {
  const constraints = {
    isValid: true,
    errors: [],
    warnings: []
  };

  const targetDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Cannot create closure for future dates
  if (targetDate > today) {
    constraints.isValid = false;
    constraints.errors.push('Cannot create closure for future dates');
  }

  // Warn if creating closure for dates older than 7 days
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  if (targetDate < sevenDaysAgo) {
    constraints.warnings.push('Creating closure for date older than 7 days. Please verify accuracy.');
  }

  // Check if there are any active sessions for the date that should be closed first
  const adminAssignment = mockDataStore.adminLotAssignments.get(adminId);
  if (adminAssignment) {
    const assignedLotIds = adminAssignment.assigned_lots.map(lot => lot.parkinglot_id);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    const activeSessions = Array.from(mockDataStore.sessions.values()).filter(session => {
      const sessionDate = new Date(session.start_time);
      return sessionDate >= startOfDay && 
             sessionDate <= endOfDay && 
             assignedLotIds.includes(session.parkinglot_id) &&
             !session.end_time;
    });

    if (activeSessions.length > 0) {
      constraints.warnings.push(`${activeSessions.length} active sessions found for this date. Consider closing them first.`);
    }
  }

  return constraints;
};

// Helper function to create closure audit trail
const createClosureAuditTrail = (closureId, adminId, operation, oldData, newData, performedBy) => {
  const auditEntry = {
    audit_id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    closure_id: closureId,
    admin_id: adminId,
    operation: operation, // 'CREATE', 'UPDATE', 'FINALIZE', 'DELETE'
    old_data: oldData,
    new_data: newData,
    performed_by: performedBy,
    timestamp: new Date().toISOString(),
    ip_address: null, // Will be set by the calling function
    user_agent: null  // Will be set by the calling function
  };

  // Log the audit entry
  logger.security('Closure audit trail entry', {
    action: 'CLOSURE_AUDIT',
    auditId: auditEntry.audit_id,
    closureId: closureId,
    operation: operation,
    adminId: adminId,
    performedBy: performedBy,
    timestamp: auditEntry.timestamp
  });

  return auditEntry;
};

// GET /admin/total_due - Get outstanding and today's collection amounts
router.get('/total_due', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const adminId = req.user.user_id;

    logger.business('Total due calculation request', {
      adminId: adminId,
      date: targetDate,
      requestedBy: req.user.user_id
    });

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Calculate today's collection
    const todayStats = calculateTodayCollection(adminId, targetDate);
    
    // Get previous day's outstanding
    const previousOutstanding = getPreviousOutstanding(adminId, targetDate);
    
    // Calculate total due
    const totalDue = previousOutstanding + todayStats.totalCollection;

    // Check if closure already exists for this date
    const existingClosure = Array.from(mockDataStore.closures.values()).find(closure => 
      closure.admin_id === adminId && closure.date === targetDate
    );

    const response = {
      success: true,
      date: targetDate,
      admin_id: adminId,
      admin_name: req.user.user_name,
      opening_balance: previousOutstanding,
      today_collection: todayStats.totalCollection,
      total_due: totalDue,
      session_statistics: {
        total_sessions: todayStats.sessionCount,
        completed_sessions: todayStats.completedSessions,
        pending_sessions: todayStats.pendingSessions
      },
      assigned_lots: todayStats.assignedLots,
      closure_status: existingClosure ? existingClosure.status : 'pending',
      amount_paid: existingClosure ? existingClosure.amount_paid : 0,
      new_outstanding: existingClosure ? existingClosure.new_outstanding : totalDue
    };

    logger.business('Total due calculated successfully', {
      adminId: adminId,
      date: targetDate,
      totalDue: totalDue,
      todayCollection: todayStats.totalCollection,
      previousOutstanding: previousOutstanding
    });

    res.status(200).json(response);

  } catch (error) {
    logger.businessError('Total due calculation error', {
      error: error.message,
      stack: error.stack,
      requestedBy: req.user.user_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during total due calculation'
    });
  }
});

// POST /admin/finalize_closure - Finalize admin payment settlement
router.post('/finalize_closure', authenticateToken, requireAdmin, async (req, res) => {
  try {
    logger.business('Closure finalization attempt', {
      requestedBy: req.user.user_id,
      requestedByRole: req.user.role,
      date: req.body.date
    });

    // Validate request body
    const { error, value } = finalizeClosure.validate(req.body);
    if (error) {
      logger.businessError('Closure finalization validation failed', {
        errors: error.details.map(detail => detail.message),
        requestedBy: req.user.user_id
      });

      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { date, amount_paid, notes } = value;
    const adminId = req.user.user_id;

    // Check if closure already exists and is finalized
    const existingClosure = Array.from(mockDataStore.closures.values()).find(closure => 
      closure.admin_id === adminId && closure.date === date
    );

    if (existingClosure && existingClosure.status === 'completed') {
      logger.businessError('Closure finalization failed - already completed', {
        adminId: adminId,
        date: date,
        existingClosureId: existingClosure.closure_id,
        requestedBy: req.user.user_id
      });

      return res.status(409).json({
        success: false,
        error: 'Closure for this date has already been finalized'
      });
    }

    // Calculate closure details
    const todayStats = calculateTodayCollection(adminId, date);
    const previousOutstanding = getPreviousOutstanding(adminId, date);
    const totalDue = previousOutstanding + todayStats.totalCollection;
    const newOutstanding = Math.max(0, totalDue - amount_paid);

    // Validate business rules
    const businessRuleErrors = validateClosureBusinessRules(adminId, date, amount_paid, totalDue);
    if (businessRuleErrors.length > 0) {
      logger.businessError('Closure finalization failed - business rule violations', {
        adminId: adminId,
        date: date,
        errors: businessRuleErrors,
        requestedBy: req.user.user_id
      });

      return res.status(400).json({
        success: false,
        error: businessRuleErrors[0],
        all_errors: businessRuleErrors
      });
    }

    // Validate closure amount
    const amountValidation = validateClosureAmount(totalDue, amount_paid, adminId, date);
    if (!amountValidation.isValid) {
      logger.businessError('Closure finalization failed - amount validation', {
        adminId: adminId,
        date: date,
        errors: amountValidation.errors,
        requestedBy: req.user.user_id
      });

      return res.status(400).json({
        success: false,
        error: amountValidation.errors[0],
        all_errors: amountValidation.errors
      });
    }

    // Get detailed financial breakdown
    const detailedFinancials = calculateDetailedFinancials(adminId, date);

    // Create or update closure record
    const closureId = generateClosureId(date, adminId);
    const closureData = {
      closure_id: closureId,
      date: date,
      admin_id: adminId,
      admin_name: req.user.user_name,
      parkinglot_ids: todayStats.assignedLots,
      opening_balance: previousOutstanding,
      today_collection: todayStats.totalCollection,
      total_due: totalDue,
      amount_paid: amount_paid,
      new_outstanding: newOutstanding,
      total_sessions: todayStats.sessionCount,
      completed_sessions: todayStats.completedSessions,
      pending_sessions: todayStats.pendingSessions,
      status: 'completed',
      notes: notes,
      created_at: existingClosure ? existingClosure.created_at : new Date().toISOString(),
      finalized_at: new Date().toISOString(),
      finalized_by: adminId
    };

    // Store closure data
    const closureKey = existingClosure ? 
      Array.from(mockDataStore.closures.keys()).find(key => mockDataStore.closures.get(key).closure_id === existingClosure.closure_id) :
      Math.max(...mockDataStore.closures.keys(), 0) + 1;
    
    mockDataStore.closures.set(closureKey, closureData);

    // Update admin statistics
    const admin = mockDataStore.admins.get(adminId);
    if (admin) {
      admin.statistics.total_revenue_handled += todayStats.totalCollection;
      admin.updated_at = new Date().toISOString();
    }

    // Comprehensive audit logging
    logger.security('Daily closure finalized', {
      action: 'CLOSURE_FINALIZED',
      closureId: closureId,
      adminId: adminId,
      adminName: req.user.user_name,
      date: date,
      totalDue: totalDue,
      amountPaid: amount_paid,
      newOutstanding: newOutstanding,
      todayCollection: todayStats.totalCollection,
      finalizedBy: adminId,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.business('Closure finalized successfully', {
      closureId: closureId,
      adminId: adminId,
      date: date,
      totalDue: totalDue,
      amountPaid: amount_paid,
      newOutstanding: newOutstanding
    });

    res.status(200).json({
      success: true,
      message: 'Closure finalized successfully',
      closure: {
        closure_id: closureId,
        date: date,
        admin_id: adminId,
        total_due: totalDue,
        amount_paid: amount_paid,
        new_outstanding: newOutstanding,
        status: 'completed',
        finalized_at: closureData.finalized_at
      }
    });

  } catch (error) {
    logger.businessError('Closure finalization error', {
      error: error.message,
      stack: error.stack,
      requestedBy: req.user.user_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during closure finalization'
    });
  }
});

// GET /admin/closure - Get daily closure data
router.get('/closure', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date, admin_id } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const targetAdminId = admin_id ? parseInt(admin_id) : req.user.user_id;

    logger.business('Closure data retrieval', {
      targetAdminId: targetAdminId,
      date: targetDate,
      requestedBy: req.user.user_id,
      requestedByRole: req.user.role
    });

    // Check if user has permission to view this admin's closure data
    if (req.user.role !== 'super_admin' && targetAdminId !== req.user.user_id) {
      logger.businessError('Closure data access denied', {
        targetAdminId: targetAdminId,
        requestedBy: req.user.user_id,
        requestedByRole: req.user.role
      });

      return res.status(403).json({
        success: false,
        error: 'You can only view your own closure data'
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Find existing closure record
    const existingClosure = Array.from(mockDataStore.closures.values()).find(closure => 
      closure.admin_id === targetAdminId && closure.date === targetDate
    );

    if (existingClosure) {
      logger.business('Closure data retrieved successfully', {
        closureId: existingClosure.closure_id,
        adminId: targetAdminId,
        date: targetDate,
        status: existingClosure.status
      });

      res.status(200).json({
        success: true,
        closure: existingClosure
      });
    } else {
      // Calculate current closure data if no record exists
      const todayStats = calculateTodayCollection(targetAdminId, targetDate);
      const previousOutstanding = getPreviousOutstanding(targetAdminId, targetDate);
      const totalDue = previousOutstanding + todayStats.totalCollection;

      const admin = mockDataStore.admins.get(targetAdminId);
      const closureData = {
        closure_id: null,
        date: targetDate,
        admin_id: targetAdminId,
        admin_name: admin?.user_name || `Admin ${targetAdminId}`,
        parkinglot_ids: todayStats.assignedLots,
        opening_balance: previousOutstanding,
        today_collection: todayStats.totalCollection,
        total_due: totalDue,
        amount_paid: 0,
        new_outstanding: totalDue,
        total_sessions: todayStats.sessionCount,
        completed_sessions: todayStats.completedSessions,
        pending_sessions: todayStats.pendingSessions,
        status: 'pending',
        notes: '',
        created_at: null,
        finalized_at: null
      };

      logger.business('Closure data calculated for pending closure', {
        adminId: targetAdminId,
        date: targetDate,
        totalDue: totalDue,
        todayCollection: todayStats.totalCollection
      });

      res.status(200).json({
        success: true,
        closure: closureData
      });
    }

  } catch (error) {
    logger.businessError('Closure data retrieval error', {
      error: error.message,
      stack: error.stack,
      requestedBy: req.user.user_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during closure data retrieval'
    });
  }
});

// POST /admin/closure - Create or update closure record
router.post('/closure', authenticateToken, requireAdmin, async (req, res) => {
  try {
    logger.business('Closure creation/update attempt', {
      requestedBy: req.user.user_id,
      requestedByRole: req.user.role,
      date: req.body.date
    });

    // Validate request body
    const { error, value } = closureSchema.validate(req.body);
    if (error) {
      logger.businessError('Closure creation validation failed', {
        errors: error.details.map(detail => detail.message),
        requestedBy: req.user.user_id
      });

      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { date, admin_id, amount_paid, notes } = value;
    const targetAdminId = admin_id || req.user.user_id;

    // Check if user has permission to create/update this admin's closure
    if (req.user.role !== 'super_admin' && targetAdminId !== req.user.user_id) {
      logger.businessError('Closure creation access denied', {
        targetAdminId: targetAdminId,
        requestedBy: req.user.user_id,
        requestedByRole: req.user.role
      });

      return res.status(403).json({
        success: false,
        error: 'You can only manage your own closure records'
      });
    }

    // Check if closure already exists
    const existingClosure = Array.from(mockDataStore.closures.values()).find(closure => 
      closure.admin_id === targetAdminId && closure.date === date
    );

    if (existingClosure && existingClosure.status === 'completed') {
      logger.businessError('Closure update failed - already completed', {
        adminId: targetAdminId,
        date: date,
        existingClosureId: existingClosure.closure_id,
        requestedBy: req.user.user_id
      });

      return res.status(409).json({
        success: false,
        error: 'Cannot modify a completed closure'
      });
    }

    // Calculate closure details
    const todayStats = calculateTodayCollection(targetAdminId, date);
    const previousOutstanding = getPreviousOutstanding(targetAdminId, date);
    const totalDue = previousOutstanding + todayStats.totalCollection;
    const paidAmount = amount_paid !== undefined ? amount_paid : 0;
    const newOutstanding = Math.max(0, totalDue - paidAmount);

    const admin = mockDataStore.admins.get(targetAdminId);
    const closureId = generateClosureId(date, targetAdminId);
    
    const closureData = {
      closure_id: closureId,
      date: date,
      admin_id: targetAdminId,
      admin_name: admin?.user_name || `Admin ${targetAdminId}`,
      parkinglot_ids: todayStats.assignedLots,
      opening_balance: previousOutstanding,
      today_collection: todayStats.totalCollection,
      total_due: totalDue,
      amount_paid: paidAmount,
      new_outstanding: newOutstanding,
      total_sessions: todayStats.sessionCount,
      completed_sessions: todayStats.completedSessions,
      pending_sessions: todayStats.pendingSessions,
      status: paidAmount > 0 ? 'completed' : 'pending',
      notes: notes || '',
      created_at: existingClosure ? existingClosure.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: req.user.user_id,
      finalized_at: paidAmount > 0 ? new Date().toISOString() : null,
      finalized_by: paidAmount > 0 ? req.user.user_id : null
    };

    // Store closure data
    const closureKey = existingClosure ? 
      Array.from(mockDataStore.closures.keys()).find(key => mockDataStore.closures.get(key).closure_id === existingClosure.closure_id) :
      Math.max(...mockDataStore.closures.keys(), 0) + 1;
    
    mockDataStore.closures.set(closureKey, closureData);

    // Audit logging
    logger.security('Closure record created/updated', {
      action: existingClosure ? 'CLOSURE_UPDATED' : 'CLOSURE_CREATED',
      closureId: closureId,
      adminId: targetAdminId,
      date: date,
      status: closureData.status,
      createdBy: req.user.user_id,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.business('Closure record processed successfully', {
      closureId: closureId,
      adminId: targetAdminId,
      date: date,
      status: closureData.status,
      action: existingClosure ? 'updated' : 'created'
    });

    res.status(existingClosure ? 200 : 201).json({
      success: true,
      message: `Closure ${existingClosure ? 'updated' : 'created'} successfully`,
      closure: closureData
    });

  } catch (error) {
    logger.businessError('Closure creation/update error', {
      error: error.message,
      stack: error.stack,
      requestedBy: req.user.user_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during closure processing'
    });
  }
});

module.exports = router;