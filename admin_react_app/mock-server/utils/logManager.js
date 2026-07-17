const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const logger = require('./logger');

class LogManager extends EventEmitter {
  constructor() {
    super();
    this.logsDir = path.join(__dirname, '..', 'logs');
    this.logStreams = new Map();
    this.logFilters = new Map();
    this.rotationPolicies = new Map();
    this.realTimeSubscribers = new Set();
    
    this.initializeLogManager();
  }

  initializeLogManager() {
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    // Set up default rotation policies
    this.setupDefaultRotationPolicies();
    
    // Set up log filtering
    this.setupLogFiltering();
    
    // Initialize real-time streaming
    this.initializeRealTimeStreaming();
    
    logger.system('Log manager initialized', {
      logsDirectory: this.logsDir,
      rotationPolicies: Array.from(this.rotationPolicies.keys()),
      filters: Array.from(this.logFilters.keys())
    });
  }

  // Set up default rotation policies
  setupDefaultRotationPolicies() {
    const policies = {
      application: {
        maxSize: '50m',
        maxFiles: '30d',
        datePattern: 'YYYY-MM-DD',
        frequency: 'daily'
      },
      error: {
        maxSize: '20m',
        maxFiles: '90d',
        datePattern: 'YYYY-MM-DD',
        frequency: 'daily'
      },
      'api-trace': {
        maxSize: '100m',
        maxFiles: '14d',
        datePattern: 'YYYY-MM-DD-HH',
        frequency: 'hourly'
      },
      performance: {
        maxSize: '50m',
        maxFiles: '14d',
        datePattern: 'YYYY-MM-DD',
        frequency: 'daily'
      },
      security: {
        maxSize: '20m',
        maxFiles: '90d',
        datePattern: 'YYYY-MM-DD',
        frequency: 'daily'
      },
      business: {
        maxSize: '30m',
        maxFiles: '60d',
        datePattern: 'YYYY-MM-DD',
        frequency: 'daily'
      }
    };

    for (const [logType, policy] of Object.entries(policies)) {
      this.rotationPolicies.set(logType, policy);
    }
  }

  // Set up log filtering and sanitization
  setupLogFiltering() {
    // Sensitive data patterns to filter
    const sensitivePatterns = [
      /password["\s]*[:=]["\s]*[^"\s,}]+/gi,
      /token["\s]*[:=]["\s]*[^"\s,}]+/gi,
      /secret["\s]*[:=]["\s]*[^"\s,}]+/gi,
      /authorization["\s]*[:=]["\s]*[^"\s,}]+/gi,
      /api[_-]?key["\s]*[:=]["\s]*[^"\s,}]+/gi,
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
    ];

    this.logFilters.set('sensitive-data', {
      patterns: sensitivePatterns,
      replacement: '[REDACTED]',
      enabled: true
    });

    // PII filtering
    const piiPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
      /\b\d{1,5}\s\w+\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi // Addresses
    ];

    this.logFilters.set('pii-data', {
      patterns: piiPatterns,
      replacement: '[PII_REDACTED]',
      enabled: process.env.NODE_ENV === 'production'
    });
  }

  // Apply filters to log data
  applyFilters(logData) {
    let filteredData = typeof logData === 'string' ? logData : JSON.stringify(logData);

    for (const [filterName, filter] of this.logFilters.entries()) {
      if (filter.enabled) {
        for (const pattern of filter.patterns) {
          filteredData = filteredData.replace(pattern, filter.replacement);
        }
      }
    }

    return typeof logData === 'string' ? filteredData : JSON.parse(filteredData);
  }

  // Initialize real-time log streaming
  initializeRealTimeStreaming() {
    // Watch log files for changes
    const logFiles = [
      'application',
      'error',
      'api-trace',
      'performance',
      'security',
      'business'
    ];

    logFiles.forEach(logType => {
      const logPattern = path.join(this.logsDir, `${logType}-*.log`);
      
      // Watch for new log files matching the pattern
      fs.watch(this.logsDir, (eventType, filename) => {
        if (filename && filename.includes(logType) && filename.endsWith('.log')) {
          this.handleLogFileChange(logType, filename, eventType);
        }
      });
    });
  }

  // Handle log file changes for real-time streaming
  handleLogFileChange(logType, filename, eventType) {
    if (eventType === 'change') {
      const filePath = path.join(this.logsDir, filename);
      
      // Read the latest log entries
      this.readLatestLogEntries(filePath, logType);
    }
  }

  // Read latest log entries from file
  readLatestLogEntries(filePath, logType) {
    try {
      const stats = fs.statSync(filePath);
      const stream = this.logStreams.get(filePath);
      
      if (!stream) {
        // Initialize stream tracking
        this.logStreams.set(filePath, {
          lastPosition: 0,
          lastSize: stats.size
        });
        return;
      }

      if (stats.size > stream.lastSize) {
        const readStream = fs.createReadStream(filePath, {
          start: stream.lastPosition,
          end: stats.size - 1
        });

        let buffer = '';
        readStream.on('data', (chunk) => {
          buffer += chunk.toString();
        });

        readStream.on('end', () => {
          const lines = buffer.split('\n').filter(line => line.trim());
          
          lines.forEach(line => {
            try {
              const logEntry = JSON.parse(line);
              this.broadcastLogEntry(logType, logEntry);
            } catch (e) {
              // Skip invalid JSON lines
            }
          });

          // Update stream position
          stream.lastPosition = stats.size;
          stream.lastSize = stats.size;
        });
      }
    } catch (error) {
      logger.systemError('Error reading log file for streaming', {
        filePath,
        error: error.message
      });
    }
  }

  // Broadcast log entry to real-time subscribers
  broadcastLogEntry(logType, logEntry) {
    const filteredEntry = this.applyFilters(logEntry);
    
    this.emit('logEntry', {
      type: logType,
      entry: filteredEntry,
      timestamp: new Date().toISOString()
    });

    // Notify real-time subscribers
    for (const subscriber of this.realTimeSubscribers) {
      try {
        subscriber.callback(logType, filteredEntry);
      } catch (error) {
        logger.systemError('Error notifying log subscriber', {
          subscriberId: subscriber.id,
          error: error.message
        });
      }
    }
  }

  // Subscribe to real-time log streaming
  subscribeToLogs(callback, options = {}) {
    const subscriberId = `subscriber_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscriber = {
      id: subscriberId,
      callback,
      filters: options.filters || [],
      logTypes: options.logTypes || ['application', 'error', 'api-trace'],
      createdAt: new Date().toISOString()
    };

    this.realTimeSubscribers.add(subscriber);

    logger.system('New log subscriber registered', {
      subscriberId,
      filters: subscriber.filters,
      logTypes: subscriber.logTypes
    });

    // Return unsubscribe function
    return () => {
      this.realTimeSubscribers.delete(subscriber);
      logger.system('Log subscriber unregistered', { subscriberId });
    };
  }

  // Get log statistics
  getLogStatistics() {
    const stats = {
      totalLogFiles: 0,
      logFilesByType: {},
      totalSize: 0,
      oldestLog: null,
      newestLog: null,
      rotationStatus: {}
    };

    try {
      const files = fs.readdirSync(this.logsDir);
      
      files.forEach(file => {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logsDir, file);
          const fileStats = fs.statSync(filePath);
          
          stats.totalLogFiles++;
          stats.totalSize += fileStats.size;
          
          // Extract log type from filename
          const logType = file.split('-')[0];
          if (!stats.logFilesByType[logType]) {
            stats.logFilesByType[logType] = {
              count: 0,
              totalSize: 0,
              files: []
            };
          }
          
          stats.logFilesByType[logType].count++;
          stats.logFilesByType[logType].totalSize += fileStats.size;
          stats.logFilesByType[logType].files.push({
            name: file,
            size: fileStats.size,
            created: fileStats.birthtime,
            modified: fileStats.mtime
          });
          
          // Track oldest and newest logs
          if (!stats.oldestLog || fileStats.birthtime < stats.oldestLog.created) {
            stats.oldestLog = {
              name: file,
              created: fileStats.birthtime
            };
          }
          
          if (!stats.newestLog || fileStats.mtime > stats.newestLog.modified) {
            stats.newestLog = {
              name: file,
              modified: fileStats.mtime
            };
          }
        }
      });

      // Add rotation policy status
      for (const [logType, policy] of this.rotationPolicies.entries()) {
        stats.rotationStatus[logType] = {
          policy,
          currentFiles: stats.logFilesByType[logType]?.count || 0,
          totalSize: stats.logFilesByType[logType]?.totalSize || 0
        };
      }

    } catch (error) {
      logger.systemError('Error getting log statistics', {
        error: error.message
      });
    }

    return stats;
  }

  // Clean up old log files based on rotation policies
  cleanupOldLogs() {
    logger.system('Starting log cleanup process');
    
    for (const [logType, policy] of this.rotationPolicies.entries()) {
      try {
        this.cleanupLogType(logType, policy);
      } catch (error) {
        logger.systemError('Error cleaning up logs', {
          logType,
          error: error.message
        });
      }
    }
  }

  // Clean up specific log type
  cleanupLogType(logType, policy) {
    const files = fs.readdirSync(this.logsDir)
      .filter(file => file.startsWith(logType) && file.endsWith('.log'))
      .map(file => {
        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          created: stats.birthtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.created - a.created);

    // Parse maxFiles (e.g., '30d', '14d')
    const maxFilesMatch = policy.maxFiles.match(/(\d+)([dwmy])/);
    if (maxFilesMatch) {
      const [, count, unit] = maxFilesMatch;
      const maxAge = this.parseTimeUnit(parseInt(count), unit);
      const cutoffDate = new Date(Date.now() - maxAge);

      const filesToDelete = files.filter(file => file.created < cutoffDate);
      
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          logger.system('Deleted old log file', {
            logType,
            fileName: file.name,
            age: Date.now() - file.created.getTime()
          });
        } catch (error) {
          logger.systemError('Error deleting log file', {
            fileName: file.name,
            error: error.message
          });
        }
      });
    }
  }

  // Parse time unit to milliseconds
  parseTimeUnit(count, unit) {
    const units = {
      'd': 24 * 60 * 60 * 1000, // days
      'w': 7 * 24 * 60 * 60 * 1000, // weeks
      'm': 30 * 24 * 60 * 60 * 1000, // months (approximate)
      'y': 365 * 24 * 60 * 60 * 1000 // years (approximate)
    };
    
    return count * (units[unit] || units.d);
  }

  // Export logs in various formats
  exportLogs(logType, startDate, endDate, format = 'json') {
    const exportData = {
      logType,
      startDate,
      endDate,
      format,
      entries: [],
      metadata: {
        exportedAt: new Date().toISOString(),
        totalEntries: 0,
        filters: Array.from(this.logFilters.keys())
      }
    };

    try {
      const files = fs.readdirSync(this.logsDir)
        .filter(file => file.startsWith(logType) && file.endsWith('.log'))
        .sort();

      files.forEach(file => {
        const filePath = path.join(this.logsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        lines.forEach(line => {
          try {
            const entry = JSON.parse(line);
            const entryDate = new Date(entry.timestamp);
            
            if (entryDate >= new Date(startDate) && entryDate <= new Date(endDate)) {
              exportData.entries.push(this.applyFilters(entry));
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        });
      });

      exportData.metadata.totalEntries = exportData.entries.length;
      
      logger.system('Log export completed', {
        logType,
        startDate,
        endDate,
        totalEntries: exportData.metadata.totalEntries
      });

      return exportData;

    } catch (error) {
      logger.systemError('Error exporting logs', {
        logType,
        error: error.message
      });
      throw error;
    }
  }
}

// Create singleton instance
const logManager = new LogManager();

// Schedule periodic cleanup (every 6 hours)
setInterval(() => {
  logManager.cleanupOldLogs();
}, 6 * 60 * 60 * 1000);

module.exports = logManager;