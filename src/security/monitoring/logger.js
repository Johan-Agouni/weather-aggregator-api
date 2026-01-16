/**
 * Security Logger - Winston Configuration
 *
 * Logs de sécurité avec rotation automatique des fichiers
 * Niveaux : error, warn, info, http, debug
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Format personnalisé pour les logs
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        // Ajouter les métadonnées si présentes
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }

        return msg;
    })
);

// Configuration de rotation des fichiers
const fileRotateTransport = new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d', // Garde les logs pendant 14 jours
    level: 'info',
});

const errorFileRotateTransport = new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d', // Garde les erreurs pendant 30 jours
    level: 'error',
});

// Création du logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    transports: [
        // Fichiers rotatifs
        fileRotateTransport,
        errorFileRotateTransport,
    ],
});

// En développement, afficher aussi dans la console
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        })
    );
}

// Méthodes de logging spécifiques à la sécurité
logger.security = {
    /**
     * Log une tentative d'attaque
     */
    attack: (type, ip, details = {}) => {
        logger.warn('SECURITY_ATTACK', {
            type,
            ip,
            ...details,
            timestamp: new Date().toISOString(),
        });
    },

    /**
     * Log un bannissement d'IP
     */
    ban: (ip, reason, duration = 'permanent') => {
        logger.warn('IP_BANNED', {
            ip,
            reason,
            duration,
            timestamp: new Date().toISOString(),
        });
    },

    /**
     * Log un débannissement d'IP
     */
    unban: ip => {
        logger.info('IP_UNBANNED', {
            ip,
            timestamp: new Date().toISOString(),
        });
    },

    /**
     * Log une requête suspecte
     */
    suspicious: (ip, reason, details = {}) => {
        logger.warn('SUSPICIOUS_REQUEST', {
            ip,
            reason,
            ...details,
            timestamp: new Date().toISOString(),
        });
    },

    /**
     * Log une violation de rate limit
     */
    rateLimit: (ip, endpoint) => {
        logger.warn('RATE_LIMIT_EXCEEDED', {
            ip,
            endpoint,
            timestamp: new Date().toISOString(),
        });
    },
};

/**
 * Log une requête HTTP
 */
logger.logHTTP = (req, res, duration) => {
    const logData = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
    };

    if (res.statusCode >= 500) {
        logger.error('HTTP Request', logData);
    } else if (res.statusCode >= 400) {
        logger.warn('HTTP Request', logData);
    } else {
        logger.http('HTTP Request', logData);
    }
};

module.exports = logger;
