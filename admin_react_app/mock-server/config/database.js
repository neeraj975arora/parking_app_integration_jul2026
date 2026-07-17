// Mock database configuration
// This file will contain mock database setup and configuration

const config = {
  development: {
    type: 'memory',
    logging: true,
    seedData: true
  },
  test: {
    type: 'memory',
    logging: false,
    seedData: false
  },
  production: {
    type: 'memory',
    logging: false,
    seedData: true
  }
};

const environment = process.env.NODE_ENV || 'development';

module.exports = config[environment];