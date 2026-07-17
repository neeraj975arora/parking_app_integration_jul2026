const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { ErrorFactory } = require('../utils/errors');

/**
 * Metrics collection and reporting utilities
 */
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byEndpoint: {},
        byStatus: {},
        responseTimeSum: 0,
        responseTimeCount: 0
      },
      errors: {
        total: 0,
        byType: {},
        byEndpoint: {},
        critical: 0
      },
      business: {
        activeSessions: 0,
        totalRevenue: 0,
        dailyRevenue: 0,
        completedSessions: 0,
        failedPayments: 0
      },
      system: {
        startTime: Date.now(),
        lastMetricsReset: Date.now()
      }
    };
  }

  /**
   * Record request metrics
   */
  recordRequest(method, endpoint, statusCode, responseTime) {
    this.metrics.requests.total++;
    
    // By method
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
    
    // By endpoint
    this.metrics.requests.byEndpoint[endpoint] = (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;
    
    // By status code
    const statusGroup = `${Math.floor(statusCode / 100)}xx`;
    this.metrics.requests.byStatus[statusGroup] = (this.metrics.requests.byStatus[statusGroup] || 0) + 1;
    
    // Response time
    if (responseTime) {
      this.metrics.requests.responseTimeSum += responseTime;
      this.metrics.requests.responseTimeCount++;
    }
  }

  /**
   * Record error metrics
   */
  recordError(errorType, endpoint, isCritical = false) {
    this.metrics.errors.total++;
    
    // By type
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
    
    // By endpoint
    this.metrics.errors.byEndpoint[endpoint] = (this.metrics.errors.byEndpoint[endpoint] || 0) + 1;
    
    // Critical errors
    if (isCritical) {
      this.metrics.errors.critical++;
    }
  }

  /**
   * Update business metrics
   */
  updateBusinessMetrics() {
    try {
      const mockDataStore = require('../data/mockData');
      
      // Count active sessions
      let activeSessions = 0;
      let completedSessions = 0;
      let totalRevenue = 0;
      let dailyRevenue = 0;
      let failedPayments = 0;
      
      const today = new Date().toISOString().split('T')[0];
      
      // Session metrics
      for (const [sessionId, session] of mockDataStore.sessions) {
        if (session.status === 'active') {
          activeSessions++;
        } else if (session.status === 'completed') {
          completedSessions++;
        }
      }
      
      // Payment metrics
      for (const [paymentId, payment] of mockDataStore.payments) {
        if (payment.status === 'completed') {
          totalRevenue += payment.amount;
          
          // Check if payment is from today
          const paymentDate = new Date(payment.created_at).toISOString().split('T')[0];
          if (paymentDate === today) {
            dailyRevenue += payment.amount;
          }
        } else if (payment.status === 'failed') {
          failedPayments++;
        }
      }
      
      this.metrics.business = {
        activeSessions,
        totalRevenue,
        dailyRevenue,
        completedSessions,
        failedPayments,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Error updating business metrics:', error);
    }
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      uptime: process.uptime(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid
    };
  }

  /**
   * Calculate derived metrics
   */
  getDerivedMetrics() {
    const avgResponseTime = this.metrics.requests.responseTimeCount > 0 
      ? this.metrics.requests.responseTimeSum / this.metrics.requests.responseTimeCount 
      : 0;
    
    const errorRate = this.metrics.requests.total > 0 
      ? (this.metrics.errors.total / this.metrics.requests.total) * 100 
      : 0;
    
    const successRate = 100 - errorRate;
    
    const requestsPerSecond = this.metrics.requests.total / (process.uptime() || 1);
    
    return {
      averageResponseTime: Math.round(avgResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      criticalErrorRate: this.metrics.requests.total > 0 
        ? (this.metrics.errors.critical / this.metrics.requests.total) * 100 
        : 0
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    this.updateBusinessMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      business: this.metrics.business,
      system: this.getSystemMetrics(),
      derived: this.getDerivedMetrics()
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byEndpoint: {},
        byStatus: {},
        responseTimeSum: 0,
        responseTimeCount: 0
      },
      errors: {
        total: 0,
        byType: {},
        byEndpoint: {},
        critical: 0
      },
      business: {
        activeSessions: 0,
        totalRevenue: 0,
        dailyRevenue: 0,
        completedSessions: 0,
        failedPayments: 0
      },
      system: {
        startTime: Date.now(),
        lastMetricsReset: Date.now()
      }
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics() {
    const metrics = this.getAllMetrics();
    const lines = [];
    
    // Request metrics
    lines.push('# HELP http_requests_total Total number of HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    lines.push(`http_requests_total ${metrics.requests.total}`);
    
    // Request duration
    lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds');
    lines.push('# TYPE http_request_duration_seconds histogram');
    lines.push(`http_request_duration_seconds_sum ${metrics.requests.responseTimeSum / 1000}`);
    lines.push(`http_request_duration_seconds_count ${metrics.requests.responseTimeCount}`);
    
    // Error metrics
    lines.push('# HELP http_errors_total Total number of HTTP errors');
    lines.push('# TYPE http_errors_total counter');
    lines.push(`http_errors_total ${metrics.errors.total}`);
    
    // Business metrics
    lines.push('# HELP parking_active_sessions Current number of active parking sessions');
    lines.push('# TYPE parking_active_sessions gauge');
    lines.push(`parking_active_sessions ${metrics.business.activeSessions}`);
    
    lines.push('# HELP parking_total_revenue_rupees Total revenue in rupees');
    lines.push('# TYPE parking_total_revenue_rupees counter');
    lines.push(`parking_total_revenue_rupees ${metrics.business.totalRevenue}`);
    
    lines.push('# HELP parking_daily_revenue_rupees Daily revenue in rupees');
    lines.push('# TYPE parking_daily_revenue_rupees gauge');
    lines.push(`parking_daily_revenue_rupees ${metrics.business.dailyRevenue}`);
    
    // System metrics
    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${metrics.system.uptime}`);
    
    lines.push('# HELP process_memory_rss_bytes Process RSS memory in bytes');
    lines.push('# TYPE process_memory_rss_bytes gauge');
    lines.push(`process_memory_rss_bytes ${metrics.system.memory.rss}`);
    
    lines.push('# HELP process_memory_heap_used_bytes Process heap used memory in bytes');
    lines.push('# TYPE process_memory_heap_used_bytes gauge');
    lines.push(`process_memory_heap_used_bytes ${metrics.system.memory.heapUsed}`);
    
    return lines.join('\n') + '\n';
  }
}

// Global metrics collector instance
const metricsCollector = new MetricsCollector();

/**
 * Middleware to collect request metrics
 */
const collectRequestMetrics = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    const endpoint = req.route?.path || req.path || 'unknown';
    
    metricsCollector.recordRequest(req.method, endpoint, res.statusCode, responseTime);
    
    // Record errors
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      const isCritical = res.statusCode >= 500;
      metricsCollector.recordError(errorType, endpoint, isCritical);
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Get all metrics
 * GET /metrics
 */
router.get('/', (req, res) => {
  try {
    const format = req.query.format || 'json';
    
    if (format === 'prometheus') {
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metricsCollector.exportPrometheusMetrics());
    } else {
      const metrics = metricsCollector.getAllMetrics();
      res.json({
        success: true,
        ...metrics
      });
    }
  } catch (error) {
    logger.error('Metrics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get request metrics only
 * GET /metrics/requests
 */
router.get('/requests', (req, res) => {
  try {
    const metrics = metricsCollector.getAllMetrics();
    res.json({
      success: true,
      timestamp: metrics.timestamp,
      requests: metrics.requests,
      derived: {
        averageResponseTime: metrics.derived.averageResponseTime,
        requestsPerSecond: metrics.derived.requestsPerSecond
      }
    });
  } catch (error) {
    logger.error('Request metrics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get error metrics only
 * GET /metrics/errors
 */
router.get('/errors', (req, res) => {
  try {
    const metrics = metricsCollector.getAllMetrics();
    res.json({
      success: true,
      timestamp: metrics.timestamp,
      errors: metrics.errors,
      derived: {
        errorRate: metrics.derived.errorRate,
        criticalErrorRate: metrics.derived.criticalErrorRate
      }
    });
  } catch (error) {
    logger.error('Error metrics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get business metrics only
 * GET /metrics/business
 */
router.get('/business', (req, res) => {
  try {
    const metrics = metricsCollector.getAllMetrics();
    res.json({
      success: true,
      timestamp: metrics.timestamp,
      business: metrics.business
    });
  } catch (error) {
    logger.error('Business metrics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get system metrics only
 * GET /metrics/system
 */
router.get('/system', (req, res) => {
  try {
    const metrics = metricsCollector.getAllMetrics();
    res.json({
      success: true,
      timestamp: metrics.timestamp,
      system: metrics.system
    });
  } catch (error) {
    logger.error('System metrics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Reset metrics (for testing/debugging)
 * POST /metrics/reset
 */
router.post('/reset', (req, res) => {
  try {
    metricsCollector.resetMetrics();
    
    logger.info('Metrics reset requested', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Metrics reset endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get performance summary
 * GET /metrics/performance
 */
router.get('/performance', (req, res) => {
  try {
    const metrics = metricsCollector.getAllMetrics();
    
    const performance = {
      timestamp: metrics.timestamp,
      summary: {
        totalRequests: metrics.requests.total,
        averageResponseTime: metrics.derived.averageResponseTime,
        requestsPerSecond: metrics.derived.requestsPerSecond,
        errorRate: metrics.derived.errorRate,
        successRate: metrics.derived.successRate,
        uptime: metrics.system.uptime
      },
      memory: {
        heapUsed: metrics.system.memory.heapUsed,
        heapTotal: metrics.system.memory.heapTotal,
        rss: metrics.system.memory.rss,
        heapUsagePercent: (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100
      },
      business: {
        activeSessions: metrics.business.activeSessions,
        dailyRevenue: metrics.business.dailyRevenue,
        completedSessions: metrics.business.completedSessions
      }
    };
    
    res.json({
      success: true,
      ...performance
    });
  } catch (error) {
    logger.error('Performance metrics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = {
  router,
  metricsCollector,
  collectRequestMetrics
};