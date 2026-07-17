const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { requestLogger, requestStatsMiddleware, errorLogger } = require('./middleware/requestLogger');
const { securityHeaders, detectSuspiciousActivity, sanitizeInput } = require('./middleware/security');
const { collectRequestMetrics } = require('./routes/metrics');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Security middleware
app.use(helmet());

// Additional security headers
app.use(securityHeaders);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.REACT_APP_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security validation middleware
app.use(detectSuspiciousActivity);
app.use(sanitizeInput);

// Request correlation and detailed logging middleware
app.use(requestLogger);

// HTTP request logging (Morgan for additional access log format)
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.system(message.trim(), { category: 'access-log' })
  }
}));

// Request statistics endpoint
app.use(requestStatsMiddleware);

// Metrics collection middleware
app.use(collectRequestMetrics);

// Serve static documentation files
app.use('/docs', express.static(path.join(__dirname, 'docs/api')));

// API routes (updated to match API specifications - no /api prefix)
app.use('/', routes);

// Root endpoint (will be handled by routes/index.js)
// Removed to avoid conflicts with route mounting

// Error logging middleware
app.use(errorLogger);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});



// Initialize mock data store
const mockDataStore = require('./data/mockData');

// Start server
app.listen(PORT, HOST, async () => {
  logger.info(`Mock server running on http://${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`CORS enabled for: ${process.env.REACT_APP_URL || 'http://localhost:5173'}`);

  // Initialize mock data store on server startup
  try {
    await mockDataStore.initialize();
    logger.info('Mock data store initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize mock data store', { error: error.message });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;