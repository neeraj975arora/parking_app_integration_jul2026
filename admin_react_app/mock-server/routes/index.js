const express = require('express');
const router = express.Router();

// Import route modules
const logsRoutes = require('./logs');
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const sessionRoutes = require('./sessions');
const closureRoutes = require('./closure');
const healthRoutes = require('./health');
const { router: metricsRoutes } = require('./metrics');
const debugRoutes = require('./debug');

// Mount routes according to API specifications (no /api prefix)
router.use('/auth', authRoutes);                    // /auth/*
router.use('/admin', adminRoutes);                  // /admin/assign_lot, /admin/remove_assignment, /admin/sessions/details/all, /admin/session/details/:user_id
router.use('/admin', sessionRoutes);                // /admin/session/checkin, /admin/session/checkout
router.use('/admin', closureRoutes);                // /admin/total_due, /admin/finalize_closure, /admin/closure
router.use('/admins', adminRoutes);                 // /admins/admin_lots/all

// Health and monitoring routes
router.use('/health', healthRoutes);                // /health/* - Health check endpoints
router.use('/metrics', metricsRoutes);              // /metrics/* - Metrics and monitoring endpoints
router.use('/debug', debugRoutes);                  // /debug/* - Debug and diagnostic endpoints (dev only)

// Keep utility routes with prefix for internal use
router.use('/api/logs', logsRoutes);                // Internal utility routes

// Root endpoint with updated route documentation
router.get('/', (req, res) => {
  res.json({
    message: 'Parking Admin Mock Server API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    availableRoutes: {
      authentication: [
        'POST /auth/login - Admin dashboard authentication',
        'GET /auth/me - Current user profile (protected)',
        'POST /auth/logout - Logout endpoint'
      ],
      adminManagement: [
        'POST /admin/assign_lot - Create admin with lot assignments (super_admin only)',
        'GET /admins/admin_lots/all - Get all admin lot assignments (super_admin only)',
        'DELETE /admin/remove_assignment - Remove admin assignment (super_admin only)',
        'GET /admin/admin_lots/:user_id - Get admin lot assignments (admin access)'
      ],
      sessionManagement: [
        'GET /admin/sessions/details/all - Get all session details (super_admin only)',
        'GET /admin/session/details/:user_id - Get admin session details (admin access)',
        'POST /admin/session/checkin - Check in a vehicle (admin only)',
        'POST /admin/session/checkout - Check out a vehicle (admin only)'
      ],
      financialManagement: [
        'GET /admin/total_due - Get outstanding and today\'s collection amounts (admin only)',
        'POST /admin/finalize_closure - Finalize admin payment settlement (admin only)',
        'GET /admin/closure - Get daily closure data (admin only)',
        'POST /admin/closure - Create or update closure record (admin only)'
      ],
      healthAndMonitoring: [
        'GET /health - Basic server health check',
        'GET /health/ready - Readiness check (for Kubernetes/Docker)',
        'GET /health/live - Liveness check (for Kubernetes/Docker)',
        'GET /health/detailed - Comprehensive health check',
        'GET /health/memory - Memory health check',
        'GET /health/datastore - Data store health check'
      ],
      metrics: [
        'GET /metrics - All metrics (JSON format)',
        'GET /metrics?format=prometheus - Prometheus format metrics',
        'GET /metrics/requests - Request metrics only',
        'GET /metrics/errors - Error metrics only',
        'GET /metrics/business - Business metrics only',
        'GET /metrics/system - System metrics only',
        'GET /metrics/performance - Performance summary',
        'POST /metrics/reset - Reset metrics (for testing)'
      ],
      debugging: [
        'GET /debug/info - System information (dev only)',
        'GET /debug/env - Environment variables (dev only)',
        'GET /debug/memory - Memory usage details (dev only)',
        'GET /debug/cpu - CPU usage information (dev only)',
        'GET /debug/data - Mock data statistics (dev only)',
        'GET /debug/profiling - Request profiling info (dev only)',
        'GET /debug/config - Configuration validation (dev only)',
        'POST /debug/heap-snapshot - Generate heap snapshot (dev only)',
        'POST /debug/gc - Force garbage collection (dev only)'
      ],
      utilities: [
        'GET /api/logs/stats - Log statistics (internal)',
        'GET /api/logs/export/:logType - Export logs (internal)',
        'GET /api/logs/stream - Real-time log streaming (internal)',
        'GET /api/logs/levels - Log level configuration (internal)',
        'POST /api/logs/levels - Update log levels (internal)',
        'POST /api/logs/cleanup - Manual log cleanup (internal)'
      ]
    },
    features: {
      validation: 'Comprehensive input validation with Joi schemas',
      errorHandling: 'Centralized error handling with custom error types',
      logging: 'Winston-based logging with multiple transports',
      monitoring: 'Health checks and metrics collection',
      debugging: 'Development debugging and diagnostic tools',
      security: 'JWT authentication and role-based access control',
      businessLogic: 'Realistic parking management business rules'
    }
  });
});

module.exports = router;