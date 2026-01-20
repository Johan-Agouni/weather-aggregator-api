/**
 * Adaptive Rate Limiting
 *
 * Rate limiting intelligent avec 3 niveaux :
 * - Normal : Utilisateurs normaux
 * - Suspect : Comportement suspect
 * - Strict : IPs à haut risque
 */

const rateLimit = require('express-rate-limit');
const logger = require('../monitoring/logger');
const ipBanManager = require('./ipBan');

/**
 * Rate limiter pour utilisateurs normaux
 */
const normalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requêtes par fenêtre
    message: {
        error: 'Too Many Requests',
        message: 'Too many requests, please try again later.',
        retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const ip = req.ip || req.connection.remoteAddress;
        logger.security.rateLimit(ip, req.originalUrl);

        // Enregistrer comme activité suspecte
        ipBanManager.recordSuspiciousActivity(ip, 'rate_limit');

        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please slow down your requests.',
            retryAfter: '15 minutes',
        });
    },
});

/**
 * Rate limiter strict pour IPs suspectes
 */
const strictRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Seulement 20 requêtes
    message: {
        error: 'Too Many Requests',
        message: 'Your IP has been flagged. Access restricted.',
        retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const ip = req.ip || req.connection.remoteAddress;
        logger.security.rateLimit(ip, req.originalUrl);

        // Bannir automatiquement après dépassement du rate limit strict
        ipBanManager.banIP(ip, 'Multiple rate limit violations', 120); // 2 heures

        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Your IP has been temporarily banned due to excessive requests.',
            bannedFor: '2 hours',
        });
    },
});

/**
 * Rate limiter très strict pour endpoints sensibles
 */
const criticalRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 5, // Seulement 5 requêtes par heure
    message: {
        error: 'Too Many Requests',
        message: 'This endpoint has strict rate limiting.',
        retryAfter: '1 hour',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Middleware adaptatif qui choisit le rate limiter selon l'IP
 */
function adaptiveRateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;

    // Vérifier si l'IP est suspecte
    const suspicious = ipBanManager.suspiciousIPs?.get(ip);

    if (suspicious) {
        // Score élevé ou tentatives multiples = rate limit strict
        if (suspicious.score >= 50 || suspicious.attempts >= 5) {
            return strictRateLimiter(req, res, next);
        }
    }

    // Sinon, rate limit normal
    return normalRateLimiter(req, res, next);
}

/**
 * Configuration des rate limiters par route
 */
const rateLimiters = {
    // API principale - Adaptatif
    api: adaptiveRateLimiter,

    // Endpoints critiques - Très strict
    critical: criticalRateLimiter,

    // Normal
    normal: normalRateLimiter,

    // Strict
    strict: strictRateLimiter,
};

module.exports = rateLimiters;
