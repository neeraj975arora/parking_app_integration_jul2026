const express = require('express');
const Joi = require('joi');
const logger = require('../utils/logger');
const mockDataStore = require('../data/mockData');
const { authenticateToken, requireAdmin, requireAdminAccess } = require('../middleware/auth');

const router = express.Router();

// Helper function to validate and format vehicle registration number
const validateAndFormatVehicleRegNo = (regNo) => {
  // Remove spaces and convert to uppercase
  const cleanRegNo = regNo.replace(/\s+/g, '').toUpperCase();
  
  // Indian vehicle registration patterns
  const patterns = [
    /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/, // Standard format: XX00XX0000
    /^[A-Z]{2}[0-9]{2}[A-Z]{1}[0-9]{4}$/,   // Alternative format: XX00X0000
  ];
  
  const isValid = patterns.some(pattern => pattern.test(cleanRegNo));
  
  if (!isValid) {
    throw new Error('Invalid vehicle registration number format');
  }
  
  return cleanRegNo;
};

// Helper function to check slot availability and capacity
const checkSlotAvailability = (lotId, slotId, vehicleType) => {
  const parkingLot = mockDataStore.parkingLots.get(lotId);
  if (!parkingLot) {
    throw new Error('Parking lot not found');
  }
  
  // Check if slot number is within valid range
  const maxSlots = vehicleType === 'car' ? parkingLot.car_slots : parkingLot.motorcycle_slots;
  if (slotId > maxSlots) {
    throw new Error(`Invalid slot number. ${vehicleType} slots range from 1 to ${maxSlots}`);
  }
  
  // Check if slot is currently occupied
  const occupiedSlot = Array.from(mockDataStore.sessions.values()).find(session => 
    session.parkinglot_id === lotId && 
    session.slot_number === `A-${slotId}` && 
    !session.end_time
  );
  
  if (occupiedSlot) {
    throw new Error(`Slot A-${slotId} is currently occupied by ${occupiedSlot.vehicle_reg_no}`);
  }
  
  return true;
};

// Helper function to check parking lot operating hours
const checkOperatingHours = (lotId) => {
  const parkingLot = mockDataStore.parkingLots.get(lotId);
  if (!parkingLot) {
    throw new Error('Parking lot not found');
  }
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [openHour, openMinute] = parkingLot.operating_hours.open.split(':').map(Number);
  const [closeHour, closeMinute] = parkingLot.operating_hours.close.split(':').map(Number);
  
  const openTime = openHour * 60 + openMinute;
  const closeTime = closeHour * 60 + closeMinute;
  
  if (currentTime < openTime || currentTime > closeTime) {
    throw new Error(`Parking lot is closed. Operating hours: ${parkingLot.operating_hours.open} - ${parkingLot.operating_hours.close}`);
  }
  
  return true;
};

// Helper function to calculate session pricing with dynamic rates
const calculateSessionPricing = (startTime, endTime, hourlyRate, vehicleType) => {
  const durationMs = endTime.getTime() - startTime.getTime();
  let durationHrs = Math.max(0.5, Math.ceil(durationMs / (1000 * 60 * 60) * 2) / 2); // Round up to nearest 0.5 hour, minimum 0.5
  
  // Apply peak hour multiplier (8-10 AM and 5-7 PM)
  const hour = endTime.getHours();
  const isPeakHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
  const peakMultiplier = isPeakHour ? 1.5 : 1.0;
  
  // Apply weekend discount (10% off on weekends)
  const isWeekend = endTime.getDay() === 0 || endTime.getDay() === 6;
  const weekendMultiplier = isWeekend ? 0.9 : 1.0;
  
  const baseAmount = durationHrs * hourlyRate;
  const totalAmount = Math.round(baseAmount * peakMultiplier * weekendMultiplier * 100) / 100;
  
  return {
    durationHrs,
    baseAmount,
    peakMultiplier,
    weekendMultiplier,
    totalAmount,
    isPeakHour,
    isWeekend
  };
};

// Helper function to update session status and create audit trail
const updateSessionStatus = (session, status, updatedBy, additionalData = {}) => {
  const previousStatus = session.status;
  session.status = status;
  session.updated_at = new Date().toISOString();
  session.updated_by = updatedBy;
  
  // Create status change audit log
  logger.security('Session status changed', {
    action: 'SESSION_STATUS_CHANGE',
    ticketId: session.ticket_id,
    vehicleRegNo: session.vehicle_reg_no,
    previousStatus: previousStatus,
    newStatus: status,
    updatedBy: updatedBy,
    timestamp: new Date().toISOString(),
    additionalData: additionalData
  });
  
  return session;
};

// Validation schemas
const checkinSchema = Joi.object({
  vehicle_reg_no: Joi.string().required().messages({
    'any.required': 'Vehicle registration number is required'
  }),
  slot_id: Joi.number().integer().positive().required().messages({
    'number.positive': 'Slot ID must be a positive number',
    'any.required': 'Slot ID is required'
  }),
  lot_id: Joi.number().integer().positive().required().messages({
    'number.positive': 'Lot ID must be a positive number',
    'any.required': 'Lot ID is required'
  }),
  vehicle_type: Joi.string().valid('car', 'motorcycle').required().messages({
    'any.only': 'Vehicle type must be either car or motorcycle',
    'any.required': 'Vehicle type is required'
  })
});

const checkoutSchema = Joi.object({
  ticket_id: Joi.string().required().messages({
    'any.required': 'Ticket ID is required'
  }),
  payment_method: Joi.string().valid('cash', 'card', 'upi', 'wallet').optional().default('cash')
});

// POST /admin/session/checkin - Check in a vehicle
router.post('/session/checkin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    logger.business('Vehicle check-in attempt', {
      requestedBy: req.user.user_id,
      requestedByRole: req.user.role,
      vehicleRegNo: req.body.vehicle_reg_no,
      lotId: req.body.lot_id
    });

    // Validate request body
    const { error, value } = checkinSchema.validate(req.body);
    if (error) {
      logger.businessError('Check-in validation failed', {
        errors: error.details.map(detail => detail.message),
        requestedBy: req.user.user_id
      });

      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    let { vehicle_reg_no, slot_id, lot_id, vehicle_type } = value;

    // Validate and format vehicle registration number
    try {
      vehicle_reg_no = validateAndFormatVehicleRegNo(vehicle_reg_no);
    } catch (error) {
      logger.businessError('Check-in failed - invalid vehicle registration', {
        vehicleRegNo: req.body.vehicle_reg_no,
        error: error.message,
        requestedBy: req.user.user_id
      });

      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Check parking lot operating hours
    try {
      checkOperatingHours(lot_id);
    } catch (error) {
      logger.businessError('Check-in failed - outside operating hours', {
        lotId: lot_id,
        error: error.message,
        requestedBy: req.user.user_id
      });

      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Check slot availability and capacity
    try {
      checkSlotAvailability(lot_id, slot_id, vehicle_type);
    } catch (error) {
      logger.businessError('Check-in failed - slot availability issue', {
        lotId: lot_id,
        slotId: slot_id,
        vehicleType: vehicle_type,
        error: error.message,
        requestedBy: req.user.user_id
      });

      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Get parking lot details
    const parkingLot = mockDataStore.parkingLots.get(lot_id);

    // Check if admin has access to this parking lot
    const adminAssignment = mockDataStore.adminLotAssignments.get(req.user.user_id);
    if (!adminAssignment || !adminAssignment.assigned_lots.some(lot => lot.parkinglot_id === lot_id)) {
      logger.businessError('Check-in failed - admin not assigned to lot', {
        lotId: lot_id,
        adminId: req.user.user_id,
        requestedBy: req.user.user_id
      });

      return res.status(403).json({
        success: false,
        error: 'You are not assigned to manage this parking lot'
      });
    }

    // Check if slot is available (no active session for this slot)
    const activeSessions = Array.from(mockDataStore.sessions.values()).filter(session => 
      session.parkinglot_id === lot_id && 
      session.slot_number === `A-${slot_id}` && 
      !session.end_time
    );

    if (activeSessions.length > 0) {
      logger.businessError('Check-in failed - slot already occupied', {
        lotId: lot_id,
        slotId: slot_id,
        activeSession: activeSessions[0].ticket_id,
        requestedBy: req.user.user_id
      });

      return res.status(409).json({
        success: false,
        error: 'Slot is already occupied'
      });
    }

    // Check if vehicle is already checked in at any location
    const existingActiveSession = Array.from(mockDataStore.sessions.values()).find(session => 
      session.vehicle_reg_no === vehicle_reg_no && !session.end_time
    );

    if (existingActiveSession) {
      logger.businessError('Check-in failed - vehicle already checked in', {
        vehicleRegNo: vehicle_reg_no,
        existingTicketId: existingActiveSession.ticket_id,
        existingLotId: existingActiveSession.parkinglot_id,
        requestedBy: req.user.user_id
      });

      return res.status(409).json({
        success: false,
        error: `Vehicle is already checked in at ${existingActiveSession.parkinglot_id} (Ticket: ${existingActiveSession.ticket_id})`
      });
    }

    // Generate new session
    const sessionId = Math.max(...mockDataStore.sessions.keys()) + 1;
    const ticketId = `TKT-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(sessionId).padStart(3, '0')}`;
    
    const newSession = {
      session_id: sessionId,
      ticket_id: ticketId,
      parkinglot_id: lot_id,
      vehicle_reg_no: vehicle_reg_no,
      user_id: req.user.user_id, // Admin who checked in the vehicle
      start_time: new Date().toISOString(),
      end_time: null,
      duration_hrs: null,
      vehicle_type: vehicle_type,
      slot_number: `A-${slot_id}`,
      payment_status: 'pending',
      amount_due: 0,
      amount_paid: 0,
      payment_method: null,
      total_amount: 0,
      hourly_rate: vehicle_type === 'car' ? parkingLot.hourly_rate_car : parkingLot.hourly_rate_motorcycle,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      checked_in_by: req.user.user_id,
      status: 'active'
    };

    // Add session to data store
    mockDataStore.sessions.set(sessionId, newSession);

    // Update admin statistics
    const admin = mockDataStore.admins.get(req.user.user_id);
    if (admin) {
      admin.statistics.sessions_managed++;
      admin.updated_at = new Date().toISOString();
    }

    // Comprehensive audit logging
    logger.security('Vehicle checked in', {
      action: 'VEHICLE_CHECKIN',
      ticketId: ticketId,
      vehicleRegNo: vehicle_reg_no,
      lotId: lot_id,
      slotNumber: `A-${slot_id}`,
      vehicleType: vehicle_type,
      checkedInBy: req.user.user_id,
      checkedInByEmail: req.user.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.business('Vehicle checked in successfully', {
      ticketId: ticketId,
      vehicleRegNo: vehicle_reg_no,
      lotId: lot_id,
      slotId: slot_id,
      checkedInBy: req.user.user_id
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle checked in successfully',
      ticket_id: ticketId,
      session: {
        ticket_id: ticketId,
        parkinglot_id: lot_id,
        vehicle_reg_no: vehicle_reg_no,
        start_time: newSession.start_time,
        vehicle_type: vehicle_type,
        slot_number: newSession.slot_number,
        hourly_rate: newSession.hourly_rate,
        status: 'active'
      }
    });

  } catch (error) {
    logger.businessError('Vehicle check-in error', {
      error: error.message,
      stack: error.stack,
      requestedBy: req.user.user_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during vehicle check-in'
    });
  }
});

// POST /admin/session/checkout - Check out a vehicle
router.post('/session/checkout', authenticateToken, requireAdmin, async (req, res) => {
  try {
    logger.business('Vehicle check-out attempt', {
      requestedBy: req.user.user_id,
      requestedByRole: req.user.role,
      ticketId: req.body.ticket_id
    });

    // Validate request body
    const { error, value } = checkoutSchema.validate(req.body);
    if (error) {
      logger.businessError('Check-out validation failed', {
        errors: error.details.map(detail => detail.message),
        requestedBy: req.user.user_id
      });

      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { ticket_id, payment_method } = value;

    // Find the session
    const session = Array.from(mockDataStore.sessions.values()).find(s => s.ticket_id === ticket_id);
    
    if (!session) {
      logger.businessError('Check-out failed - session not found', {
        ticketId: ticket_id,
        requestedBy: req.user.user_id
      });

      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if session is already completed
    if (session.end_time) {
      logger.businessError('Check-out failed - session already completed', {
        ticketId: ticket_id,
        endTime: session.end_time,
        requestedBy: req.user.user_id
      });

      return res.status(409).json({
        success: false,
        error: 'Session is already completed'
      });
    }

    // Check if admin has access to this parking lot (super admins have access to all lots)
    if (req.user.role !== 'super_admin') {
      const adminAssignment = mockDataStore.adminLotAssignments.get(req.user.user_id);
      if (!adminAssignment || !adminAssignment.assigned_lots.some(lot => lot.parkinglot_id === session.parkinglot_id)) {
        logger.businessError('Check-out failed - admin not assigned to lot', {
          lotId: session.parkinglot_id,
          adminId: req.user.user_id,
          requestedBy: req.user.user_id
        });

        return res.status(403).json({
          success: false,
          error: 'You are not assigned to manage this parking lot'
        });
      }
    }

    // Calculate duration and amount using enhanced pricing logic
    const startTime = new Date(session.start_time);
    const endTime = new Date();
    const pricingDetails = calculateSessionPricing(startTime, endTime, session.hourly_rate, session.vehicle_type);
    
    const { durationHrs, totalAmount, baseAmount, peakMultiplier, weekendMultiplier, isPeakHour, isWeekend } = pricingDetails;

    // Update session
    session.end_time = endTime.toISOString();
    session.duration_hrs = durationHrs;
    session.amount_due = totalAmount;
    session.amount_paid = totalAmount;
    session.total_amount = totalAmount;
    session.payment_method = payment_method;
    session.payment_status = 'success'; // Assume payment is successful for mock
    session.updated_at = new Date().toISOString();
    session.checked_out_by = req.user.user_id;
    session.status = 'completed';
    session.payment_timestamp = new Date().toISOString();

    // Create payment record
    const paymentId = Math.max(...mockDataStore.payments.keys()) + 1;
    const payment = {
      payment_id: paymentId,
      session_id: session.session_id,
      ticket_id: ticket_id,
      user_id: session.user_id,
      parkinglot_id: session.parkinglot_id,
      amount: totalAmount,
      payment_method: payment_method,
      payment_status: 'success',
      transaction_id: `TXN-${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      payment_timestamp: new Date().toISOString(),
      gateway_response: {
        code: '200',
        message: 'Transaction successful',
        gateway_txn_id: `GW${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      },
      processing_fee: payment_method === 'card' ? totalAmount * 0.02 : 0,
      net_amount: totalAmount - (payment_method === 'card' ? totalAmount * 0.02 : 0),
      currency: 'INR',
      created_at: session.start_time,
      updated_at: new Date().toISOString()
    };

    mockDataStore.payments.set(paymentId, payment);

    // Update admin statistics
    const admin = mockDataStore.admins.get(req.user.user_id);
    if (admin) {
      admin.statistics.payments_processed++;
      admin.statistics.total_revenue_handled += totalAmount;
      admin.updated_at = new Date().toISOString();
    }

    // Comprehensive audit logging
    logger.security('Vehicle checked out', {
      action: 'VEHICLE_CHECKOUT',
      ticketId: ticket_id,
      vehicleRegNo: session.vehicle_reg_no,
      lotId: session.parkinglot_id,
      slotNumber: session.slot_number,
      duration: durationHrs,
      amount: totalAmount,
      paymentMethod: payment_method,
      checkedOutBy: req.user.user_id,
      checkedOutByEmail: req.user.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.business('Vehicle checked out successfully', {
      ticketId: ticket_id,
      vehicleRegNo: session.vehicle_reg_no,
      duration: durationHrs,
      amount: totalAmount,
      paymentMethod: payment_method,
      checkedOutBy: req.user.user_id
    });

    res.status(200).json({
      success: true,
      message: 'Vehicle checked out successfully',
      session: {
        ticket_id: ticket_id,
        vehicle_reg_no: session.vehicle_reg_no,
        start_time: session.start_time,
        end_time: session.end_time,
        duration_hrs: durationHrs,
        amount_due: totalAmount,
        amount_paid: totalAmount,
        payment_method: payment_method,
        payment_status: 'success',
        status: 'completed'
      },
      payment: {
        payment_id: paymentId,
        transaction_id: payment.transaction_id,
        amount: totalAmount,
        payment_method: payment_method,
        status: 'success'
      }
    });

  } catch (error) {
    logger.businessError('Vehicle check-out error', {
      error: error.message,
      stack: error.stack,
      requestedBy: req.user.user_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during vehicle check-out'
    });
  }
});

module.exports = router;