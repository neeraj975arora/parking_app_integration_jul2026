// Centralized mock data store
const logger = require('../utils/logger');

class MockDataStore {
  constructor() {
    this.users = new Map();
    this.admins = new Map();
    this.superAdmins = new Map();
    this.parkingLots = new Map();
    this.sessions = new Map();
    this.payments = new Map();
    this.closures = new Map();
    this.adminLotAssignments = new Map();
    
    // Data generation tracking
    this.initialized = false;
    this.generationStats = {
      usersGenerated: false,
      parkingLotsGenerated: false,
      sessionsGenerated: false,
      paymentsGenerated: false,
      lastGenerated: null
    };
  }

  // Initialize data store with comprehensive data generation
  async initialize() {
    if (this.initialized) {
      logger.data('Mock data store already initialized');
      return;
    }

    try {
      logger.data('Starting mock data store initialization');
      
      // Import data orchestrator
      const DataOrchestrator = require('./generators/dataOrchestrator');
      const dataOrchestrator = new DataOrchestrator();
      
      // Generate all data (users, parking lots, sessions, payments, assignments)
      await dataOrchestrator.generateAllData();
      this.generationStats.usersGenerated = true;
      this.generationStats.parkingLotsGenerated = true;
      this.generationStats.sessionsGenerated = true;
      this.generationStats.paymentsGenerated = true;
      
      // Log comprehensive generation statistics
      const stats = dataOrchestrator.getComprehensiveStatistics();
      logger.data('Complete data generation finished', stats);
      
      this.generationStats.lastGenerated = new Date().toISOString();
      this.initialized = true;
      
      logger.data('Mock data store initialization completed', {
        totalUsers: this.users.size,
        totalAdmins: this.admins.size,
        totalSuperAdmins: this.superAdmins.size,
        totalAssignments: this.adminLotAssignments.size
      });
      
    } catch (error) {
      logger.dataError('Error initializing mock data store', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Helper methods for data access
  getAllUsers() {
    return Array.from(this.users.values());
  }

  getAllAdmins() {
    return Array.from(this.admins.values());
  }

  getAllSuperAdmins() {
    return Array.from(this.superAdmins.values());
  }

  getAllParkingLots() {
    return Array.from(this.parkingLots.values());
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  getAllPayments() {
    return Array.from(this.payments.values());
  }

  getAllClosures() {
    return Array.from(this.closures.values());
  }

  // User management methods
  getUserById(id) {
    return this.users.get(id) || this.admins.get(id) || this.superAdmins.get(id);
  }

  getUserByEmail(email) {
    const allUsers = [
      ...this.users.values(),
      ...this.admins.values(),
      ...this.superAdmins.values()
    ];
    return allUsers.find(user => user.user_email === email);
  }

  // Admin lot assignment methods
  getAdminLotAssignments(adminId) {
    return this.adminLotAssignments.get(adminId) || [];
  }

  // Session filtering methods
  getSessionsByLotIds(lotIds) {
    return this.getAllSessions().filter(session => 
      lotIds.includes(session.parkinglot_id)
    );
  }

  getActiveSessionsByLotIds(lotIds) {
    return this.getSessionsByLotIds(lotIds).filter(session => 
      !session.end_time
    );
  }

  // Reset data store
  reset() {
    this.users.clear();
    this.admins.clear();
    this.superAdmins.clear();
    this.parkingLots.clear();
    this.sessions.clear();
    this.payments.clear();
    this.closures.clear();
    this.adminLotAssignments.clear();
    this.initialized = false;
  }
}

// Export singleton instance
module.exports = new MockDataStore();