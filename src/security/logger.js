/**
 * Security Logger - Winston Configuration
 *
 * Structured logging system for security events
 * - Daily rotating files
 * - Separate files for different log levels
 * - JSON format for easy parsing
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Custom format for console output (terminal style)
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    const meta = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
    const levelColors = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m', // Yellow
        info: '\x1b[36m', // Cyan
        debug: '\x1b[35m', // Magenta
    };
    const color = levelColors[level] || '\x1b[37m';
    const reset = '\x1b[0m';

    return `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message} ${meta}`;
});

// Transport for security events (attacks, bans, etc.)
const securityTransport = new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'warn', // Only warnings and errors
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
});

// Transport for all events
const allTransport = new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
});

// Transport for error events only
const errorTransport = new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
});

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [securityTransport, allTransport, errorTransport],
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp({ format: 'HH:mm:ss' }),
                consoleFormat
            ),
        })
    );
}

// Helper methods for security logging
logger.security = {
    /**
     * Log a security event (attack attempt, suspicious activity)
     */
    event: (type, details) => {
        logger.warn('SECURITY_EVENT', {
            event_type: type,
            ...details,
            severity: details.severity || 'medium',
        });
    },

    /**
     * Log an IP ban
     */
    ban: (ip, reason, duration) => {
        logger.warn('IP_BANNED', {
            ip,
            reason,
            duration,
            banned_at: new Date().toISOString(),
        });
    },

    /**
     * Log an attack detection
     */
    attack: (ip, attackType, details) => {
        logger.error('ATTACK_DETECTED', {
            ip,
            attack_type: attackType,
            ...details,
            detected_at: new Date().toISOString(),
        });
    },

    /**
     * Log rate limit exceeded
     */
    rateLimit: (ip, endpoint, requestCount) => {
        logger.warn('RATE_LIMIT_EXCEEDED', {
            ip,
            endpoint,
            request_count: requestCount,
            timestamp: new Date().toISOString(),
        });
    },

    /**
     * Log suspicious pattern detected
     */
    suspicious: (ip, pattern, confidence) => {
        logger.warn('SUSPICIOUS_ACTIVITY', {
            ip,
            pattern,
            confidence_score: confidence,
            timestamp: new Date().toISOString(),
        });
    },
};

module.exports = logger;
