const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { ErrorFactory } = require('../utils/errors');

/**
 * Debug and diagnostic utilities
 * Note: These endpoints should only be available in development mode
 */
class DebugUtils {
  /**
   * Get system information
   */
  static getSystemInfo() {
    const os = require('os');
    
    return {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime(),
        cwd: process.cwd(),
        execPath: process.execPath,
        argv: process.argv
      },
      system: {
        hostname: os.hostname(),
        type: os.type(),
        release: os.release(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
        networkInterfaces: Object.keys(os.networkInterfaces())
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: Intl.DateTimeFormat().resolvedOptions().locale
      }
    };
  }

  /**
   * Get environment variables (sanitized)
   */
  static getEnvironmentVariables() {
    const sensitiveKeys = [
      'password', 'secret', 'key', 'token', 'api_key', 'private',
      'jwt_secret', 'db_password', 'auth_secret'
    ];

    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
      
      env[key] = isSensitive ? '[REDACTED]' : value;
    }

    return env;
  }

  /**
   * Get memory usage details
   */
  static getMemoryUsage() {
    const memUsage = process.memoryUsage();
    const os = require('os');
    
    return {
      process: {
        rss: {
          bytes: memUsage.rss,
          mb: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100
        },
        heapTotal: {
          bytes: memUsage.heapTotal,
          mb: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100
        },
        heapUsed: {
          bytes: memUsage.heapUsed,
          mb: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        external: {
          bytes: memUsage.external,
          mb: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
        },
        arrayBuffers: {
          bytes: memUsage.arrayBuffers,
          mb: Math.round(memUsage.arrayBuffers / 1024 / 1024 * 100) / 100
        }
      },
      system: {
        total: {
          bytes: os.totalmem(),
          gb: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100
        },
        free: {
          bytes: os.freemem(),
          gb: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100
        },
        used: {
          bytes: os.totalmem() - os.freemem(),
          gb: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024 * 100) / 100,
          percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
        }
      }
    };
  }

  /**
   * Get CPU usage information
   */
  static getCPUUsage() {
    const os = require('os');
    const cpuUsage = process.cpuUsage();
    
    return {
      process: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        total: cpuUsage.user + cpuUsage.system
      },
      system: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        speed: os.cpus()[0]?.speed || 0,
        loadAverage: {
          '1min': os.loadavg()[0],
          '5min': os.loadavg()[1],
          '15min': os.loadavg()[2]
        }
      }
    };
  }

  /**
   * Get mock data statistics
   */
  static getMockDataStats() {
    try {
      const mockDataStore = require('../data/mockData');
      
      const stats = {
        collections: {
          superAdmins: mockDataStore.superAdmins.size,
          admins: mockDataStore.admins.size,
          users: mockDataStore.users.size,
          parkingLots: mockDataStore.parkingLots.size,
          sessions: mockDataStore.sessions.size,
          payments: mockDataStore.payments.size,
          closures: mockDataStore.closures.size
        },
        sessionStats: {
          active: 0,
          completed: 0,
          cancelled: 0,
          byVehicleType: { car: 0, motorcycle: 0 },
          byPaymentStatus: { pending: 0, completed: 0, failed: 0 }
        },
        paymentStats: {
          totalAmount: 0,
          byStatus: { pending: 0, completed: 0, failed: 0, refunded: 0 },
          byMethod: { cash: 0, digital: 0, card: 0 }
        },
        lotStats: {
          totalCapacity: 0,
          carSlots: 0,
          motorcycleSlots: 0,
          activeLots: 0
        }
      };

      // Calculate session statistics
      for (const [sessionId, session] of mockDataStore.sessions) {
        stats.sessionStats[session.status]++;
        stats.sessionStats.byVehicleType[session.vehicle_type]++;
        stats.sessionStats.byPaymentStatus[session.payment_status]++;
      }

      // Calculate payment statistics
      for (const [paymentId, payment] of mockDataStore.payments) {
        stats.paymentStats.totalAmount += payment.amount;
        stats.paymentStats.byStatus[payment.status]++;
        stats.paymentStats.byMethod[payment.payment_method]++;
      }

      // Calculate lot statistics
      for (const [lotId, lot] of mockDataStore.parkingLots) {
        stats.lotStats.totalCapacity += lot.total_slots;
        stats.lotStats.carSlots += lot.car_slots;
        stats.lotStats.motorcycleSlots += lot.motorcycle_slots;
        if (lot.is_active) {
          stats.lotStats.activeLots++;
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting mock data stats:', error);
      return {
        error: error.message,
        collections: {},
        sessionStats: {},
        paymentStats: {},
        lotStats: {}
      };
    }
  }

  /**
   * Get request profiling information
   */
  static getRequestProfiling() {
    // This would typically integrate with profiling tools
    // For mock server, we'll provide basic information
    return {
      enabled: process.env.NODE_ENV === 'development',
      tools: {
        v8Profiler: false,
        heapSnapshot: true,
        cpuProfile: false
      },
      recommendations: [
        'Use --inspect flag for Chrome DevTools debugging',
        'Use --prof flag for V8 profiling',
        'Consider using clinic.js for production profiling'
      ]
    };
  }

  /**
   * Generate heap snapshot (development only)
   */
  static generateHeapSnapshot() {
    if (process.env.NODE_ENV !== 'development') {
      throw ErrorFactory.authorization('Heap snapshots are only available in development mode');
    }

    try {
      const v8 = require('v8');
      const fs = require('fs');
      const path = require('path');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `heap-snapshot-${timestamp}.heapsnapshot`;
      const filepath = path.join(__dirname, '../logs', filename);

      const snapshot = v8.writeHeapSnapshot(filepath);
      
      return {
        success: true,
        filename,
        filepath: snapshot,
        size: fs.statSync(snapshot).size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error generating heap snapshot:', error);
      throw ErrorFactory.filesystem('Failed to generate heap snapshot', error.message);
    }
  }

  /**
   * Get configuration validation results
   */
  static validateConfiguration() {
    const validations = [];
    
    // Check required environment variables
    const requiredEnvVars = ['NODE_ENV'];
    for (const envVar of requiredEnvVars) {
      validations.push({
        check: `Environment variable: ${envVar}`,
        status: process.env[envVar] ? 'pass' : 'fail',
        value: process.env[envVar] || 'not set'
      });
    }

    // Check file system permissions
    const fs = require('fs');
    const testPaths = ['../logs', '../data'];
    
    for (const testPath of testPaths) {
      try {
        const fullPath = require('path').join(__dirname, testPath);
        fs.accessSync(fullPath, fs.constants.R_OK | fs.constants.W_OK);
        validations.push({
          check: `File system access: ${testPath}`,
          status: 'pass',
          value: 'readable and writable'
        });
      } catch (error) {
        validations.push({
          check: `File system access: ${testPath}`,
          status: 'fail',
          value: error.message
        });
      }
    }

    // Check mock data integrity
    try {
      const mockDataStore = require('../data/mockData');
      const hasData = mockDataStore.superAdmins.size > 0 && 
                      mockDataStore.admins.size > 0 && 
                      mockDataStore.sessions.size > 0;
      
      validations.push({
        check: 'Mock data integrity',
        status: hasData ? 'pass' : 'warning',
        value: hasData ? 'data loaded successfully' : 'minimal data detected'
      });
    } catch (error) {
      validations.push({
        check: 'Mock data integrity',
        status: 'fail',
        value: error.message
      });
    }

    const overallStatus = validations.every(v => v.status === 'pass') ? 'pass' :
                         validations.some(v => v.status === 'fail') ? 'fail' : 'warning';

    return {
      overallStatus,
      validations,
      timestamp: new Date().toISOString()
    };
  }
}

// Middleware to restrict debug endpoints to development mode
const developmentOnly = (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Debug endpoints are only available in development mode',
      environment: process.env.NODE_ENV || 'production'
    });
  }
  next();
};

/**
 * Get system information
 * GET /debug/info
 */
router.get('/info', developmentOnly, (req, res) => {
  try {
    const systemInfo = DebugUtils.getSystemInfo();
    res.json({
      success: true,
      ...systemInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Debug info endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get environment variables
 * GET /debug/env
 */
router.get('/env', developmentOnly, (req, res) => {
  try {
    const env = DebugUtils.getEnvironmentVariables();
    res.json({
      success: true,
      environment: env,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Debug env endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get memory usage
 * GET /debug/memory
 */
router.get('/memory', developmentOnly, (req, res) => {
  try {
    const memoryUsage = DebugUtils.getMemoryUsage();
    res.json({
      success: true,
      memory: memoryUsage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Debug memory endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get CPU usage
 * GET /debug/cpu
 */
router.get('/cpu', developmentOnly, (req, res) => {
  try {
    const cpuUsage = DebugUtils.getCPUUsage();
    res.json({
      success: true,
      cpu: cpuUsage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Debug CPU endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get mock data statistics
 * GET /debug/data
 */
router.get('/data', developmentOnly, (req, res) => {
  try {
    const dataStats = DebugUtils.getMockDataStats();
    res.json({
      success: true,
      data: dataStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Debug data endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get request profiling information
 * GET /debug/profiling
 */
router.get('/profiling', developmentOnly, (req, res) => {
  try {
    const profiling = DebugUtils.getRequestProfiling();
    res.json({
      success: true,
      profiling,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Debug profiling endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate heap snapshot
 * POST /debug/heap-snapshot
 */
router.post('/heap-snapshot', developmentOnly, (req, res) => {
  try {
    const snapshot = DebugUtils.generateHeapSnapshot();
    res.json({
      success: true,
      snapshot,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Debug heap snapshot endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Validate configuration
 * GET /debug/config
 */
router.get('/config', developmentOnly, (req, res) => {
  try {
    const validation = DebugUtils.validateConfiguration();
    const statusCode = validation.overallStatus === 'fail' ? 500 : 200;
    
    res.status(statusCode).json({
      success: validation.overallStatus !== 'fail',
      configuration: validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Debug config endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Force garbage collection (development only)
 * POST /debug/gc
 */
router.post('/gc', developmentOnly, (req, res) => {
  try {
    if (global.gc) {
      const beforeMemory = process.memoryUsage();
      global.gc();
      const afterMemory = process.memoryUsage();
      
      res.json({
        success: true,
        message: 'Garbage collection forced',
        memory: {
          before: beforeMemory,
          after: afterMemory,
          freed: {
            rss: beforeMemory.rss - afterMemory.rss,
            heapUsed: beforeMemory.heapUsed - afterMemory.heapUsed,
            heapTotal: beforeMemory.heapTotal - afterMemory.heapTotal
          }
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Garbage collection not available. Start with --expose-gc flag.',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Debug GC endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;