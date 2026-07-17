const express = require('express');
const router = express.Router();
const logManager = require('../utils/logManager');
const logger = require('../utils/logger');

// Get log statistics
router.get('/stats', (req, res) => {
  try {
    const stats = logManager.getLogStatistics();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.systemError('Error retrieving log statistics', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve log statistics'
    });
  }
});

// Export logs
router.get('/export/:logType', (req, res) => {
  try {
    const { logType } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required'
      });
    }

    const exportData = logManager.exportLogs(logType, startDate, endDate, format);
    
    // Set appropriate headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${logType}-logs-${startDate}-to-${endDate}.json"`);
    
    res.json(exportData);
  } catch (error) {
    logger.systemError('Error exporting logs', {
      logType: req.params.logType,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to export logs'
    });
  }
});

// Real-time log streaming endpoint (Server-Sent Events)
router.get('/stream', (req, res) => {
  // Set headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const { logTypes, filters } = req.query;
  const options = {
    logTypes: logTypes ? logTypes.split(',') : ['application', 'error', 'api-trace'],
    filters: filters ? filters.split(',') : []
  };

  logger.system('Log streaming client connected', {
    clientIP: req.ip,
    options
  });

  // Subscribe to log updates
  const unsubscribe = logManager.subscribeToLogs((logType, logEntry) => {
    // Filter by log types if specified
    if (options.logTypes.includes(logType)) {
      const eventData = {
        type: logType,
        entry: logEntry,
        timestamp: new Date().toISOString()
      };

      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    }
  }, options);

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    message: 'Log streaming connected',
    options,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    unsubscribe();
    logger.system('Log streaming client disconnected', {
      clientIP: req.ip
    });
  });

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000); // Every 30 seconds

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Get log levels configuration
router.get('/levels', (req, res) => {
  const levels = {
    current: process.env.LOG_LEVEL || 'info',
    available: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
    environment: process.env.NODE_ENV || 'development',
    payloadLogging: process.env.ENABLE_PAYLOAD_LOGGING === 'true'
  };

  res.json({
    success: true,
    data: levels
  });
});

// Update log level (development only)
router.post('/levels', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Log level changes not allowed in production'
    });
  }

  const { level, enablePayloadLogging } = req.body;

  if (level) {
    process.env.LOG_LEVEL = level;
    logger.system('Log level updated', { newLevel: level });
  }

  if (enablePayloadLogging !== undefined) {
    process.env.ENABLE_PAYLOAD_LOGGING = enablePayloadLogging.toString();
    logger.system('Payload logging updated', { enabled: enablePayloadLogging });
  }

  res.json({
    success: true,
    message: 'Log configuration updated',
    data: {
      level: process.env.LOG_LEVEL,
      payloadLogging: process.env.ENABLE_PAYLOAD_LOGGING === 'true'
    }
  });
});

// Trigger log cleanup manually
router.post('/cleanup', (req, res) => {
  try {
    logManager.cleanupOldLogs();
    res.json({
      success: true,
      message: 'Log cleanup initiated'
    });
  } catch (error) {
    logger.systemError('Error initiating log cleanup', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to initiate log cleanup'
    });
  }
});

module.exports = router;