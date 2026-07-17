#!/usr/bin/env node

// Data reset script
const logger = require('../utils/logger');
const mockDataStore = require('../data/mockData');

async function resetData() {
  try {
    logger.info('Resetting mock data...');
    
    // Reset data store
    mockDataStore.reset();
    
    logger.info('Mock data reset completed');
    
  } catch (error) {
    logger.error('Error resetting data:', error);
    process.exit(1);
  }
}

// Run reset if called directly
if (require.main === module) {
  resetData();
}

module.exports = resetData;