const logger = require('./logger');
const { ErrorUtils } = require('./errors');

/**
 * Specialized error logging utilities
 */
class ErrorLogger {
  /**
   * Log validation errors with detailed context
   */
  static logValidationError(error, req, validationContext = {}) {
    logger.validationError('Validation error occurred:', {
      error: {
        message: error.message,
        field: error.field,
        type: error.type,
        details: error.details
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        body: ErrorLogger.sanitizeForLogging(req.body),
        params: req.params,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.user_id,
        userRole: req.user?.role
      },
      validation: validationContext,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log authentication errors with security context
   */
  static logAuthenticationError(error, req, authContext = {}) {
    logger.authError('Authentication error occurred:', {
      error: {
        message: error.message,
        type: error.type,
        details: error.details
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        // Don't log sensitive auth data
        hasAuthHeader: !!req.headers.authorization,
        authHeaderType: req.headers.authorization?.split(' ')[0]
      },
      authentication: authContext,
      security: {
        suspiciousActivity: ErrorLogger.detectSuspiciousActivity(req),
        rateLimit: ErrorLogger.checkRateLimit(req)
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log business logic errors with domain context
   */
  static logBusinessLogicError(error, req, businessContext = {}) {
    logger.businessError('Business logic error occurred:', {
      error: {
        message: error.message,
        rule: error.rule,
        type: error.type,
        details: error.details
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        body: ErrorLogger.sanitizeForLogging(req.body),
        params: req.params,
        query: req.query,
        userId: req.user?.user_id,
        userRole: req.user?.role
      },
      business: businessContext,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log system errors with technical context
   */
  static logSystemError(error, req, systemContext = {}) {
    const severity = ErrorUtils.getErrorSeverity(error);
    const logMethod = severity === 'critical' ? logger.error : logger.warn;

    logMethod('System error occurred:', {
      error: {
        message: error.message,
        name: error.name,
        type: error.type,
        stack: error.stack,
        details: error.details
      },
      request: req ? {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.user_id
      } : null,
      system: {
        ...systemContext,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      },
      severity,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log performance-related errors
   */
  static logPerformanceError(error, req, performanceContext = {}) {
    logger.performanceError('Performance error occurred:', {
      error: {
        message: error.message,
        type: error.type,
        details: error.details
      },
      request: req ? {
        method: req.method,
        url: req.originalUrl,
        startTime: req.startTime,
        duration: req.startTime ? Date.now() - req.startTime : null
      } : null,
      performance: {
        ...performanceContext,
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log security-related errors
   */
  static logSecurityError(error, req, securityContext = {}) {
    logger.securityError('Security error occurred:', {
      error: {
        message: error.message,
        type: error.type,
        details: error.details
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        headers: ErrorLogger.sanitizeHeaders(req.headers),
        userId: req.user?.user_id,
        userRole: req.user?.role
      },
      security: {
        ...securityContext,
        suspiciousActivity: ErrorLogger.detectSuspiciousActivity(req),
        ipReputation: ErrorLogger.checkIPReputation(req.ip),
        userAgentAnalysis: ErrorLogger.analyzeUserAgent(req.get('User-Agent'))
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create error aggregation report
   */
  static createErrorAggregationReport(timeWindow = '1h') {
    // This would typically query a logging database or service
    // For mock server, we'll create a simulated report
    const report = {
      timeWindow,
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: 0,
        errorsByType: {},
        errorsByEndpoint: {},
        errorsByUser: {},
        criticalErrors: 0,
        topErrors: []
      },
      trends: {
        errorRate: 0,
        averageResponseTime: 0,
        failureRate: 0
      },
      recommendations: []
    };

    logger.info('Error aggregation report generated:', report);
    return report;
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  static sanitizeForLogging(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password', 'user_password', 'new_password', 'current_password', 'confirm_password',
      'token', 'access_token', 'refresh_token', 'api_key', 'secret',
      'credit_card', 'card_number', 'cvv', 'ssn', 'social_security',
      'bank_account', 'routing_number', 'pin'
    ];

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    const sanitizeRecursive = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeRecursive(item));
      }

      if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            result[key] = '[REDACTED]';
          } else if (typeof value === 'object') {
            result[key] = sanitizeRecursive(value);
          } else {
            result[key] = value;
          }
        }
        return result;
      }

      return obj;
    };

    return sanitizeRecursive(sanitized);
  }

  /**
   * Sanitize headers for logging
   */
  static sanitizeHeaders(headers) {
    const sensitiveHeaders = [
      'authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token'
    ];

    const sanitized = { ...headers };
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Detect suspicious activity patterns
   */
  static detectSuspiciousActivity(req) {
    const suspiciousPatterns = {
      sqlInjection: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
      xssAttempt: /<script|javascript:|on\w+\s*=/i,
      pathTraversal: /\.\.\//,
      commandInjection: /[;&|`$()]/
    };

    const suspicious = [];
    const checkString = `${req.originalUrl} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)}`;

    for (const [type, pattern] of Object.entries(suspiciousPatterns)) {
      if (pattern.test(checkString)) {
        suspicious.push(type);
      }
    }

    return {
      detected: suspicious.length > 0,
      patterns: suspicious,
      riskLevel: suspicious.length > 2 ? 'high' : suspicious.length > 0 ? 'medium' : 'low'
    };
  }

  /**
   * Check rate limiting status
   */
  static checkRateLimit(req) {
    // This would typically check against a rate limiting store (Redis, etc.)
    // For mock server, we'll simulate the check
    return {
      exceeded: false,
      remaining: 100,
      resetTime: Date.now() + 900000, // 15 minutes
      windowSize: '15m'
    };
  }

  /**
   * Check IP reputation (simulated)
   */
  static checkIPReputation(ip) {
    // This would typically check against threat intelligence services
    return {
      reputation: 'good',
      country: 'unknown',
      isp: 'unknown',
      isProxy: false,
      isTor: false,
      threatLevel: 'low'
    };
  }

  /**
   * Analyze user agent for suspicious patterns
   */
  static analyzeUserAgent(userAgent) {
    if (!userAgent) {
      return { suspicious: true, reason: 'missing_user_agent' };
    }

    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i, /scanner/i,
      /curl/i, /wget/i, /python/i, /java/i, /go-http/i
    ];

    const suspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

    return {
      suspicious,
      userAgent: userAgent.substring(0, 200), // Truncate for logging
      reason: suspicious ? 'suspicious_pattern' : null
    };
  }

  /**
   * Create error correlation analysis
   */
  static createErrorCorrelation(errors) {
    // Analyze patterns in errors to identify root causes
    const correlation = {
      commonPatterns: [],
      timeCorrelation: [],
      userCorrelation: [],
      endpointCorrelation: [],
      recommendations: []
    };

    // This would contain more sophisticated analysis logic
    logger.info('Error correlation analysis completed:', correlation);
    return correlation;
  }

  /**
   * Generate error metrics for monitoring
   */
  static generateErrorMetrics(timeWindow = '5m') {
    const metrics = {
      timestamp: new Date().toISOString(),
      timeWindow,
      errorRate: 0,
      errorCount: 0,
      errorsByType: {},
      errorsByEndpoint: {},
      averageErrorResolutionTime: 0,
      criticalErrorCount: 0,
      userImpact: {
        affectedUsers: 0,
        affectedSessions: 0,
        businessImpact: 'low'
      }
    };

    logger.info('Error metrics generated:', metrics);
    return metrics;
  }
}

module.exports = ErrorLogger;