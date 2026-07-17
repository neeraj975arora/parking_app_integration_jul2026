const express = require('express');
const Joi = require('joi');
const logger = require('../utils/logger');
const mockDataStore = require('../data/mockData');
const { authenticateToken, requireSuperAdmin, requireAdmin, requireAdminAccess } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const assignLotSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  assigned_lots: Joi.array().items(Joi.number().integer().positive()).min(1).required().messages({
    'array.min': 'At least one parking lot must be assigned',
    'any.required': 'Assigned lots are required'
  }),
  role: Joi.string().valid('admin').optional()
});

// POST /admin/assign_lot - Create new admin with lot assignments (Super Admin Only)
router.post('/assign_lot', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    logger.business('Admin creation attempt', {
      requestedBy: req.user.user_id,
      requestedByRole: req.user.role,
      targetEmail: req.body.email
    });

    // Validate request body
    const { error, value } = assignLotSchema.validate(req.body);
    if (error) {
      logger.businessError('Admin creation validation failed', {
        errors: error.details.map(detail => detail.message),
        requestedBy: req.user.user_id
      });

      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { name, email, password, assigned_lots } = value;

    // Check if email already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      logger.businessError('Admin creation failed - duplicate email', {
        email: email,
        requestedBy: req.user.user_id
      });

      return res.status(409).json({
        success: false,
        error: 'An admin with this email already exists.'
      });
    }

    // Validate that all assigned lots exist
    const invalidLots = [];
    const conflictingAssignments = [];
    
    for (const lotId of assigned_lots) {
      if (!mockDataStore.parkingLots.has(lotId)) {
        invalidLots.push(lotId);
      } else {
        // Check for existing assignments to prevent conflicts
        for (const [adminId, assignment] of mockDataStore.adminLotAssignments.entries()) {
          if (assignment.assigned_lots.some(lot => lot.parkinglot_id === lotId)) {
            const existingAdmin = mockDataStore.admins.get(adminId);
            conflictingAssignments.push({
              lotId: lotId,
              assignedTo: existingAdmin?.user_name || `Admin ${adminId}`,
              adminId: adminId
            });
          }
        }
      }
    }

    if (invalidLots.length > 0) {
      logger.businessError('Admin creation failed - invalid lot IDs', {
        invalidLots: invalidLots,
        requestedBy: req.user.user_id
      });

      return res.status(400).json({
        success: false,
        error: `Parking lot(s) with ID(s) ${invalidLots.join(', ')} do not exist.`
      });
    }

    if (conflictingAssignments.length > 0) {
      logger.businessError('Admin creation failed - lot assignment conflicts', {
        conflicts: conflictingAssignments,
        requestedBy: req.user.user_id
      });

      return res.status(409).json({
        success: false,
        error: `Parking lot(s) already assigned to other admins: ${conflictingAssignments.map(c => `Lot ${c.lotId} (assigned to ${c.assignedTo})`).join(', ')}`
      });
    }

    // Generate new admin user ID
    const newUserId = Math.max(...mockDataStore.admins.keys(), ...mockDataStore.superAdmins.keys(), ...mockDataStore.users.keys()) + 1;

    // Hash the password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new admin user object
    const newAdmin = {
      user_id: newUserId,
      user_name: name,
      user_email: email,
      user_phone: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      user_address: `Admin Office, ${['Delhi', 'Mumbai', 'Bangalore', 'Chennai'][Math.floor(Math.random() * 4)]}`,
      role: 'admin',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: null,
      password_hash: passwordHash,
      profile: {
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || 'Admin',
        employee_id: `ADM${String(newUserId).padStart(4, '0')}`,
        department: 'Parking Operations',
        designation: 'Parking Manager',
        joining_date: new Date().toISOString(),
        work_location: ['Delhi', 'Mumbai', 'Bangalore', 'Chennai'][Math.floor(Math.random() * 4)]
      },
      admin_details: {
        assigned_lots: assigned_lots,
        permissions: [
          'view_sessions',
          'manage_sessions',
          'view_payments',
          'process_payments',
          'view_reports',
          'manage_users'
        ],
        shift_timings: {
          start_time: '09:00',
          end_time: '18:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        }
      },
      statistics: {
        sessions_managed: 0,
        payments_processed: 0,
        total_revenue_handled: 0,
        customer_satisfaction_rating: 4.5
      }
    };

    // Add admin to data store
    mockDataStore.admins.set(newUserId, newAdmin);

    // Create admin lot assignments
    const assignmentData = {
      admin_id: newUserId,
      admin_name: name,
      assigned_lots: assigned_lots.map(lotId => ({
        parkinglot_id: lotId,
        lot_name: mockDataStore.parkingLots.get(lotId)?.name || `Parking Lot ${lotId}`,
        assignment_date: new Date().toISOString()
      })),
      assignment_date: new Date().toISOString(),
      created_by: req.user.user_id,
      is_active: true
    };

    mockDataStore.adminLotAssignments.set(newUserId, assignmentData);

    // Comprehensive audit logging
    logger.security('Admin account created', {
      action: 'ADMIN_CREATED',
      newAdminId: newUserId,
      newAdminEmail: email,
      newAdminName: name,
      assignedLots: assigned_lots,
      createdBy: req.user.user_id,
      createdByEmail: req.user.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.business('Admin created successfully', {
      newUserId: newUserId,
      email: email,
      assignedLots: assigned_lots,
      createdBy: req.user.user_id
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      user_id: newUserId,
      role: 'admin',
      assigned_lots: assigned_lots
    });

  } catch (error) {
    logger.businessError('Admin creation error', {
      error: error.message,
      stack: error.stack,
      requestedBy: req.user.user_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during admin creation'
    });
  }
});

// GET /admin_lots/all - Get all admin lot assignments (Super Admin Only)
router.get('/admin_lots/all', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    logger.business('All admin lots retrieval', {
      requestedBy: req.user.user_id,
      requestedByRole: req.user.role
    });

    const adminAssignments = [];

    // Get all admin assignments with detailed information
    for (const [adminId, assignment] of mockDataStore.adminLotAssignments.entries()) {
      const adminDetails = mockDataStore.admins.get(adminId);
      
      // Build detailed assigned lots with location information
      const detailedAssignedLots = assignment.assigned_lots.map(lot => {
        const parkingLot = mockDataStore.parkingLots.get(lot.parkinglot_id);
        return {
          parkinglot_id: lot.parkinglot_id,
          parking_name: parkingLot?.name || `Parking Lot ${lot.parkinglot_id}`,
          location: {
            address: parkingLot?.location?.address || `${parkingLot?.location?.city || 'Unknown City'}`,
            landmark: parkingLot?.location?.landmark || 'Near Main Road',
            coordinates: {
              latitude: parkingLot?.location?.coordinates?.latitude || 19.0760,
              longitude: parkingLot?.location?.coordinates?.longitude || 72.8777
            }
          },
          parking_type: parkingLot?.parking_type || 'commercial',
          assigned_date: lot.assignment_date || lot.assigned_date || new Date().toISOString()
        };
      });

      adminAssignments.push({
        admin_id: assignment.admin_id,
        admin_name: assignment.admin_name,
        admin_email: adminDetails?.user_email,
        admin_phone_no: adminDetails?.user_phone,
        admin_address: adminDetails?.user_address || 'Admin Office Address',
        joining_date: adminDetails?.created_at,
        status: assignment.is_active ? 'active' : 'inactive',
        assigned_lots: detailedAssignedLots,
        // Include permissions and shift_timings for some admins (future use)
        ...(adminId % 2 === 0 && {
          permissions: ["*"],
          shift_timings: {
            start_time: "10:00",
            end_time: "18:00",
            shift_name: "Regular Shift",
            days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
          }
        })
      });
    }

    logger.business('All admin lots retrieved successfully', {
      totalAdmins: adminAssignments.length,
      requestedBy: req.user.user_id
    });

    res.status(200).json({
      meta: {
        total: adminAssignments.length
      },
      data: adminAssignments
    });

  } catch (error) {
    logger.businessError('All admin lots retrieval error', {
      error: error.message,
      stack: error.stack,
      requestedBy: req.user.user_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during admin lots retrieval'
    });
  }
});

// DELETE /admin/remove_assignment - Remove admin assignment (Super Admin Only)
router.delete('/remove_assignment', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { user_id } = req.body;

    logger.business('Admin removal attempt', {
      targetUserId: user_id,
      requestedBy: req.user.user_id,
      requestedByRole: req.user.role
    });

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if admin exists
    if (!mockDataStore.admins.has(user_id)) {
      logger.businessError('Admin removal failed - admin not found', {
        targetUserId: user_id,
        requestedBy: req.user.user_id
      });

      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Get admin details before removal for logging
    const adminToRemove = mockDataStore.admins.get(user_id);
    const assignmentToRemove = mockDataStore.adminLotAssignments.get(user_id);

    // Remove admin from admins data store
    mockDataStore.admins.delete(user_id);

    // Remove admin lot assignments
    mockDataStore.adminLotAssignments.delete(user_id);

    // Comprehensive audit logging for admin removal
    logger.security('Admin account removed', {
      action: 'ADMIN_REMOVED',
      removedAdminId: user_id,
      removedAdminName: adminToRemove?.user_name,
      removedAdminEmail: adminToRemove?.user_email,
      removedAssignedLots: assignmentToRemove?.assigned_lots?.map(lot => lot.parkinglot_id) || [],
      removedBy: req.user.user_id,
      removedByEmail: req.user.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Log successful removal with details
    logger.business('Admin removed successfully', {
      removedUserId: user_id,
      removedAdminName: adminToRemove?.user_name,
      removedAdminEmail: adminToRemove?.user_email,
      removedAssignedLots: assignmentToRemove?.assigned_lots?.map(lot => lot.parkinglot_id) || [],
      removedBy: req.user.user_id
    });

    res.status(200).json({
      success: true,
      message: 'Admin assignment removed successfully'
    });

  } catch (error) {
    logger.businessError('Admin removal error', {
      error: error.message,
      stack: error.stack,
      requestedBy: req.user.user_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during admin removal'
    });
  }
});

// GET /admin_lots/:user_id - Get admin lot assignments for specific admin
router.get('/admin_lots/:user_id', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.user_id);

    logger.business('Admin lots retrieval for specific admin', {
      targetUserId: targetUserId,
      requestedBy: req.user.user_id,
      requestedByRole: req.user.role
    });

    // Get admin assignment
    const assignment = mockDataStore.adminLotAssignments.get(targetUserId);

    if (!assignment) {
      logger.businessError('Admin lots retrieval failed - admin not found', {
        targetUserId: targetUserId,
        requestedBy: req.user.user_id
      });

      return res.status(404).json({
        success: false,
        error: 'Admin not found or has no lot assignments'
      });
    }

    // Get full admin details
    const adminDetails = mockDataStore.admins.get(targetUserId);

    // Build detailed assigned lots with location information
    const detailedAssignedLots = assignment.assigned_lots.map(lot => {
      const parkingLot = mockDataStore.parkingLots.get(lot.parkinglot_id);
      return {
        parkinglot_id: lot.parkinglot_id,
        parking_name: parkingLot?.name || `Parking Lot ${lot.parkinglot_id}`,
        location: {
          address: parkingLot?.location?.address || `${parkingLot?.location?.city || 'Unknown City'}`,
          landmark: parkingLot?.location?.landmark || 'Near Main Road',
          coordinates: {
            latitude: parkingLot?.location?.coordinates?.latitude || 19.0760,
            longitude: parkingLot?.location?.coordinates?.longitude || 72.8777
          }
        },
        parking_type: parkingLot?.parking_type || 'commercial',
        assigned_date: lot.assignment_date || lot.assigned_date || new Date().toISOString()
      };
    });

    const response = {
      admin_id: assignment.admin_id,
      admin_name: assignment.admin_name,
      admin_email: adminDetails?.user_email,
      admin_phone_no: adminDetails?.user_phone,
      admin_address: adminDetails?.user_address || 'Admin Office Address',
      joining_date: adminDetails?.created_at,
      status: assignment.is_active ? 'active' : 'inactive',
      assigned_lots: detailedAssignedLots
      // Future fields commented out for now
      // "permissions": ["*"],
      // "shift_timings": {
      //   "start_time": "10:00",
      //   "end_time": "18:00",
      //   "shift_name": "Regular Shift",
      //   "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
      // }
    };

    logger.business('Admin lots retrieved successfully', {
      targetUserId: targetUserId,
      assignedLots: response.assigned_lots.length,
      requestedBy: req.user.user_id
    });

    res.status(200).json(response);

  } catch (error) {
    logger.businessError('Admin lots retrieval error', {
      error: error.message,
      stack: error.stack,
      targetUserId: req.params.user_id,
      requestedBy: req.user.user_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during admin lots retrieval'
    });
  }
});

// GET /admin/sessions/details/all - Get all session details (Super Admin Only)
router.get('/sessions/details/all', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    logger.business('All sessions retrieval', {
      requestedBy: req.user.user_id,
      requestedByRole: req.user.role
    });

    // Get all sessions from the last 3 months
    const sessions = Array.from(mockDataStore.sessions.values());
    
    // Format sessions according to API specification
    const formattedSessions = sessions.map(session => ({
      ticket_id: session.ticket_id,
      parkinglot_id: session.parkinglot_id,
      vehicle_reg_no: session.vehicle_reg_no,
      user_id: session.user_id,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_hrs: session.duration_hrs,
      vehicle_type: session.vehicle_type
    }));

    logger.business('All sessions retrieved successfully', {
      totalSessions: formattedSessions.length,
      requestedBy: req.user.user_id
    });

    res.status(200).json(formattedSessions);

  } catch (error) {
    logger.businessError('All sessions retrieval error', {
      error: error.message,
      stack: error.stack,
      requestedBy: req.user.user_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during sessions retrieval'
    });
  }
});

// GET /admin/session/details/:user_id - Get session details for specific admin
router.get('/session/details/:user_id', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.user_id);

    logger.business('Admin sessions retrieval', {
      targetUserId: targetUserId,
      requestedBy: req.user.user_id,
      requestedByRole: req.user.role
    });

    // Get admin's assigned lots
    const assignment = mockDataStore.adminLotAssignments.get(targetUserId);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found or has no lot assignments'
      });
    }

    const assignedLotIds = assignment.assigned_lots.map(lot => lot.parkinglot_id);
    
    // Filter sessions by assigned lots
    const allSessions = Array.from(mockDataStore.sessions.values());
    const adminSessions = allSessions.filter(session => 
      assignedLotIds.includes(session.parkinglot_id)
    );

    // Format sessions according to API specification
    const formattedSessions = adminSessions.map(session => ({
      ticket_id: session.ticket_id,
      parkinglot_id: session.parkinglot_id,
      vehicle_reg_no: session.vehicle_reg_no,
      user_id: session.user_id,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_hrs: session.duration_hrs,
      vehicle_type: session.vehicle_type
    }));

    logger.business('Admin sessions retrieved successfully', {
      targetUserId: targetUserId,
      totalSessions: formattedSessions.length,
      assignedLots: assignedLotIds.length,
      requestedBy: req.user.user_id
    });

    res.status(200).json(formattedSessions);

  } catch (error) {
    logger.businessError('Admin sessions retrieval error', {
      error: error.message,
      stack: error.stack,
      targetUserId: req.params.user_id,
      requestedBy: req.user.user_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during admin sessions retrieval'
    });
  }
});

// Helper function to find user by email across all user stores
const findUserByEmail = (email) => {
  // Check super admins
  for (const [userId, user] of mockDataStore.superAdmins.entries()) {
    if (user.user_email.toLowerCase() === email.toLowerCase()) {
      return user;
    }
  }
  
  // Check admins
  for (const [userId, user] of mockDataStore.admins.entries()) {
    if (user.user_email.toLowerCase() === email.toLowerCase()) {
      return user;
    }
  }
  
  // Check regular users
  for (const [userId, user] of mockDataStore.users.entries()) {
    if (user.user_email.toLowerCase() === email.toLowerCase()) {
      return user;
    }
  }
  
  return null;
};

module.exports = router;