const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { ErrorFactory } = require('../utils/errors');

/**
 * Health check utilities
 */
class HealthChecks {
  /**
   * Check server basic health
   */
  static async checkServerHealth() {
    const startTime = Date.now();
    
    try {
      // Basic server checks
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development',
        responseTime: Date.now() - startTime
      };

      return health;
    } catch (error) {
      logger.error('Server health check failed:', error);
      throw ErrorFactory.configuration('Server health check failed', error.message);
    }
  }

  /**
   * Check file system health
   */
  static async checkFileSystemHealth() {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const testFile = path.join(__dirname, '../logs/.health-check');
      const testData = `Health check: ${Date.now()}`;
      
      // Test write
      await fs.writeFile(testFile, testData);
      
      // Test read
      const readData = await fs.readFile(testFile, 'utf8');
      
      // Test delete
      await fs.unlink(testFile);
      
      return {
        status: 'healthy',
        writable: true,
        readable: true,
        deletable: true,
        testCompleted: true
      };
    } catch (error) {
      logger.error('File system health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        writable: false,
        readable: false,
        deletable: false,
        testCompleted: false
      };
    }
  }

  /**
   * Check memory health
   */
  static checkMemoryHealth() {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    
    const memoryUsagePercent = (memUsage.rss / totalMemory) * 100;
    const systemMemoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    const status = memoryUsagePercent > 90 ? 'critical' : 
                   memoryUsagePercent > 70 ? 'warning' : 'healthy';
    
    return {
      status,
      processMemory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
        usagePercent: memoryUsagePercent
      },
      systemMemory: {
        total: totalMemory,
        free: freeMemory,
        used: totalMemory - freeMemory,
        usagePercent: systemMemoryUsagePercent
      }
    };
  }

  /**
   * Check CPU health
   */
  static checkCPUHealth() {
    const os = require('os');
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // Calculate CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    
    const status = loadAvg[0] > cpus.length * 0.8 ? 'warning' : 'healthy';
    
    return {
      status,
      cores: cpus.length,
      loadAverage: {
        '1min': loadAvg[0],
        '5min': loadAvg[1],
        '15min': loadAvg[2]
      },
      usage: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percent: cpuPercent
      }
    };
  }

  /**
   * Check mock data store health
   */
  static checkDataStoreHealth() {
    try {
      const mockDataStore = require('../data/mockData');
      
      const counts = {
        superAdmins: mockDataStore.superAdmins.size,
        admins: mockDataStore.admins.size,
        users: mockDataStore.users.size,
        parkingLots: mockDataStore.parkingLots.size,
        sessions: mockDataStore.sessions.size,
        payments: mockDataStore.payments.size,
        closures: mockDataStore.closures.size
      };
      
      const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
      
      return {
        status: totalRecords > 0 ? 'healthy' : 'warning',
        counts,
        totalRecords,
        dataIntegrity: HealthChecks.checkDataIntegrity(mockDataStore)
      };
    } catch (error) {
      logger.error('Data store health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        counts: {},
        totalRecords: 0
      };
    }
  }

  /**
   * Check data integrity
   */
  static checkDataIntegrity(mockDataStore) {
    try {
      let issues = [];
      
      // Check for orphaned sessions (sessions without valid users or lots)
      for (const [sessionId, session] of mockDataStore.sessions) {
        if (session.user_id && !mockDataStore.users.has(session.user_id)) {
          issues.push(`Session ${sessionId} references non-existent user ${session.user_id}`);
        }
        
        if (!mockDataStore.parkingLots.has(session.parkinglot_id)) {
          issues.push(`Session ${sessionId} references non-existent lot ${session.parkinglot_id}`);
        }
      }
      
      // Check for orphaned payments
      for (const [paymentId, payment] of mockDataStore.payments) {
        let sessionExists = false;
        for (const [sessionId, session] of mockDataStore.sessions) {
          if (session.ticket_id === payment.session_id) {
            sessionExists = true;
            break;
          }
        }
        
        if (!sessionExists) {
          issues.push(`Payment ${paymentId} references non-existent session ${payment.session_id}`);
        }
      }
      
      return {
        status: issues.length === 0 ? 'healthy' : 'warning',
        issues: issues.slice(0, 10), // Limit to first 10 issues
        totalIssues: issues.length
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Comprehensive health check
   */
  static async performComprehensiveHealthCheck() {
    const startTime = Date.now();
    
    try {
      const [
        serverHealth,
        fileSystemHealth,
        memoryHealth,
        cpuHealth,
        dataStoreHealth
      ] = await Promise.all([
        HealthChecks.checkServerHealth(),
        HealthChecks.checkFileSystemHealth(),
        Promise.resolve(HealthChecks.checkMemoryHealth()),
        Promise.resolve(HealthChecks.checkCPUHealth()),
        Promise.resolve(HealthChecks.checkDataStoreHealth())
      ]);

      const overallStatus = HealthChecks.determineOverallStatus([
        serverHealth.status,
        fileSystemHealth.status,
        memoryHealth.status,
        cpuHealth.status,
        dataStoreHealth.status
      ]);

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checkDuration: Date.now() - startTime,
        checks: {
          server: serverHealth,
          fileSystem: fileSystemHealth,
          memory: memoryHealth,
          cpu: cpuHealth,
          dataStore: dataStoreHealth
        }
      };
    } catch (error) {
      logger.error('Comprehensive health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checkDuration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Determine overall status from individual check statuses
   */
  static determineOverallStatus(statuses) {
    if (statuses.includes('unhealthy') || statuses.includes('critical')) {
      return 'unhealthy';
    }
    if (statuses.includes('warning')) {
      return 'degraded';
    }
    return 'healthy';
  }
}

/**
 * Basic health check endpoint
 * GET /health
 */
router.get('/', async (req, res) => {
  try {
    const health = await HealthChecks.checkServerHealth();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      success: true,
      ...health
    });
  } catch (error) {
    logger.error('Health check endpoint error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Readiness check endpoint (for Kubernetes/Docker)
 * GET /health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    const health = await HealthChecks.performComprehensiveHealthCheck();
    
    const isReady = health.status === 'healthy' || health.status === 'degraded';
    const statusCode = isReady ? 200 : 503;
    
    res.status(statusCode).json({
      success: isReady,
      ready: isReady,
      ...health
    });
  } catch (error) {
    logger.error('Readiness check endpoint error:', error);
    res.status(503).json({
      success: false,
      ready: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness check endpoint (for Kubernetes/Docker)
 * GET /health/live
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    success: true,
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Detailed health check endpoint
 * GET /health/detailed
 */
router.get('/detailed', async (req, res) => {
  try {
    const health = await HealthChecks.performComprehensiveHealthCheck();
    
    const statusCode = health.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json({
      success: health.status !== 'unhealthy',
      ...health
    });
  } catch (error) {
    logger.error('Detailed health check endpoint error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Memory health check endpoint
 * GET /health/memory
 */
router.get('/memory', (req, res) => {
  try {
    const memoryHealth = HealthChecks.checkMemoryHealth();
    
    const statusCode = memoryHealth.status === 'critical' ? 503 : 200;
    res.status(statusCode).json({
      success: memoryHealth.status !== 'critical',
      ...memoryHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Memory health check endpoint error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Data store health check endpoint
 * GET /health/datastore
 */
router.get('/datastore', (req, res) => {
  try {
    const dataStoreHealth = HealthChecks.checkDataStoreHealth();
    
    const statusCode = dataStoreHealth.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json({
      success: dataStoreHealth.status !== 'unhealthy',
      ...dataStoreHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Data store health check endpoint error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;