// Server configuration settings
const serverConfig = {
  port: process.env.PORT || 3001,
  host: process.env.HOST || 'localhost',
  
  // CORS configuration
  cors: {
    origin: process.env.REACT_APP_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // requests per window
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },

  // Security configuration
  security: {
    helmet: {
      contentSecurityPolicy: false, // Disable for development
      crossOriginEmbedderPolicy: false
    },
    compression: true,
    jsonLimit: '10mb',
    urlEncodedLimit: '10mb'
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'mock-server-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: '7d',
    algorithm: 'HS256'
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    payloadLogging: process.env.ENABLE_PAYLOAD_LOGGING === 'true',
    maxPayloadSize: '1mb'
  },

  // Mock data configuration
  mockData: {
    generateOnStartup: process.env.GENERATE_MOCK_DATA !== 'false',
    dataRange: {
      startDate: '2024-10-08', // 3 months ago
      endDate: '2025-01-08',   // today
      totalDays: 92
    },
    users: {
      superAdmins: 2,
      admins: 15,
      regularUsers: 500
    },
    parkingLots: {
      total: 25,
      capacityRange: { min: 20, max: 100 }
    },
    sessions: {
      dailyRange: { min: 150, max: 200 },
      totalEstimate: 15000
    }
  }
};

module.exports = serverConfig;