/**
 * Attack Detection Middleware
 *
 * Détecte les patterns d'attaque dans les requêtes
 */

const logger = require('../monitoring/logger');
const { analytics } = require('../monitoring/analytics');
const ipBanManager = require('./ipBan');
const { detectThreats } = require('../utils/threatDetection');

/**
 * Middleware principal de détection d'attaques
 */
function attackDetectionMiddleware(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const threatsFound = [];

    // Analyser les paramètres de query
    for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
            const result = detectThreats(value, `query.${key}`);
            if (result.isMalicious) {
                threatsFound.push(...result.threats);
            }
        }
    }

    // Analyser le body
    if (req.body && typeof req.body === 'object') {
        for (const [key, value] of Object.entries(req.body)) {
            if (typeof value === 'string') {
                const result = detectThreats(value, `body.${key}`);
                if (result.isMalicious) {
                    threatsFound.push(...result.threats);
                }
            }
        }
    }

    // Si des menaces détectées
    if (threatsFound.length > 0) {
        const primaryThreat = threatsFound[0].type;

        logger.warn('ATTACK_DETECTED', {
            ip,
            type: primaryThreat,
            url: req.originalUrl,
            threats: threatsFound,
        });

        // Enregistrer dans analytics
        analytics.recordThreat(primaryThreat, ip, { url: req.originalUrl });

        // Enregistrer comme activité suspecte
        const shouldBan = ipBanManager.recordSuspiciousActivity(ip, primaryThreat);

        if (shouldBan) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Your IP has been automatically banned',
            });
        }

        return res.status(400).json({
            error: 'Bad Request',
            message: 'Malicious input detected',
        });
    }

    next();
}

/**
 * Middleware de détection de User-Agent suspects
 */
function suspiciousUserAgentMiddleware(req, res, next) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.connection.remoteAddress;

    if (!userAgent) {
        return next();
    }

    // Patterns suspects
    const suspiciousPatterns = [
        /sqlmap/i,
        /nikto/i,
        /nmap/i,
        /masscan/i,
        /burp/i,
        /metasploit/i,
        /havij/i,
        /acunetix/i,
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(userAgent)) {
            logger.warn('SUSPICIOUS_USER_AGENT', {
                ip,
                userAgent,
                url: req.originalUrl,
            });

            ipBanManager.recordSuspiciousActivity(ip, 'suspicious_tool');
            break;
        }
    }

    next();
}

/**
 * Middleware pour bloquer les requêtes sans User-Agent
 */
function noUserAgentMiddleware(req, res, next) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.connection.remoteAddress;

    // Autoriser les endpoints internes sans User-Agent
    if (req.path.startsWith('/health') || req.path.startsWith('/api/security')) {
        return next();
    }

    if (!userAgent || userAgent.trim() === '') {
        logger.warn('NO_USER_AGENT', {
            ip,
            url: req.originalUrl,
        });

        ipBanManager.recordSuspiciousActivity(ip, 'no_user_agent');

        return res.status(400).json({
            error: 'Bad Request',
            message: 'User-Agent header required',
        });
    }

    next();
}

module.exports = {
    attackDetectionMiddleware,
    suspiciousUserAgentMiddleware,
    noUserAgentMiddleware,
};
