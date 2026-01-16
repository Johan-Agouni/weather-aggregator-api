/**
 * Rate Limiting Middleware
 *
 * Système de limitation de débit avec détection de patterns
 */

const rateLimit = require('express-rate-limit');
const logger = require('../monitoring/logger');
const ipBanManager = require('./ipBan');

/**
 * Rate limiter modéré pour les endpoints normaux
 */
const moderateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const ip = req.ip || req.connection.remoteAddress;
        logger.warn('RATE_LIMIT_EXCEEDED', {
            ip,
            endpoint: req.originalUrl,
        });

        ipBanManager.recordSuspiciousActivity(ip, 'rate_limit');

        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please slow down.',
            retryAfter: '15 minutes',
        });
    },
});

/**
 * Rate limiter strict pour les endpoints sensibles
 */
const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const ip = req.ip || req.connection.remoteAddress;
        logger.warn('STRICT_RATE_LIMIT_EXCEEDED', {
            ip,
            endpoint: req.originalUrl,
        });

        // Bannir automatiquement
        ipBanManager.banIP(ip, 'Excessive requests to sensitive endpoint', 120);

        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Your IP has been temporarily banned.',
            bannedFor: '2 hours',
        });
    },
});

/**
 * Middleware d'analyse de patterns de requêtes
 */
const requestPatterns = new Map(); // IP -> patterns

function patternAnalysisMiddleware(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;

    // Ignorer les fichiers statiques
    if (req.path.match(/\.(css|js|png|jpg|ico)$/)) {
        return next();
    }

    // Ignorer les endpoints du dashboard (auto-refresh toutes les 5s)
    const dashboardEndpoints = [
        '/api/security/stats',
        '/api/security/events',
        '/api/security/banned-ips',
        '/api/security/suspicious-ips',
    ];
    if (dashboardEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
        return next(); // Skip pattern analysis for dashboard
    }

    const now = Date.now();
    const pattern = requestPatterns.get(ip) || {
        requests: [],
        lastClean: now,
    };

    // Ajouter la requête actuelle
    pattern.requests.push({
        timestamp: now,
        path: req.path,
        method: req.method,
    });

    // Nettoyer les vieilles requêtes (> 1 minute)
    if (now - pattern.lastClean > 60000) {
        pattern.requests = pattern.requests.filter(r => now - r.timestamp < 60000);
        pattern.lastClean = now;
    }

    requestPatterns.set(ip, pattern);

    // Analyser le pattern
    const requestsLastMinute = pattern.requests.length;

    // Plus de 30 requêtes en 1 minute = suspect
    if (requestsLastMinute > 30) {
        logger.warn('ABNORMAL_REQUEST_PATTERN', {
            ip,
            requestsPerMinute: requestsLastMinute,
        });

        ipBanManager.recordSuspiciousActivity(ip, 'rate_limit');
    }

    // Détecter les scans (multiples endpoints différents rapidement)
    const uniquePaths = new Set(pattern.requests.map(r => r.path));
    if (uniquePaths.size > 10 && requestsLastMinute > 20) {
        logger.warn('POSSIBLE_SCAN_DETECTED', {
            ip,
            uniquePaths: uniquePaths.size,
            requestsPerMinute: requestsLastMinute,
        });

        ipBanManager.recordSuspiciousActivity(ip, 'path_traversal');
    }

    next();
}

// Nettoyer les patterns toutes les 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, pattern] of requestPatterns.entries()) {
        // Supprimer si pas d'activité depuis 5 minutes
        if (pattern.requests.length === 0 || now - pattern.lastClean > 300000) {
            requestPatterns.delete(ip);
        }
    }
}, 300000);

module.exports = {
    moderateLimiter,
    strictLimiter,
    patternAnalysisMiddleware,
};
