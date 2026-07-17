#!/usr/bin/env node

// Data seeding script
// This will be implemented in data generation tasks

const logger = require('../utils/logger');
const mockDataStore = require('../data/mockData');

async function seedData() {
  try {
    logger.info('Starting data seeding...');
    
    // Initialize mock data store
    await mockDataStore.initialize();
    
    // Data generation will be implemented in later tasks
    logger.info('Data seeding completed (placeholder - actual seeding pending)');
    
  } catch (error) {
    logger.error('Error seeding data:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;