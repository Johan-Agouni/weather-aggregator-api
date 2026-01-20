/**
 * Threat Detection - Détection de patterns malveillants
 *
 * Détecte : SQL injection, XSS, Path Traversal, Command Injection
 */

const logger = require('../monitoring/logger');
const ipBanManager = require('../middleware/ipBan');

/**
 * Patterns de détection d'attaques
 */
const ATTACK_PATTERNS = {
    // SQL Injection
    sql_injection: [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|EXEC|EXECUTE)\b)/gi,
        /(--|;|\/\*|\*\/|xp_|sp_)/gi,
        /('|(\\')|(--)|(%27)|(0x27))/gi,
        /(\bOR\b.*=.*)/gi,
        /(\bAND\b.*=.*)/gi,
    ],

    // XSS (Cross-Site Scripting)
    xss: [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // onclick, onerror, etc.
        /<img[^>]+src[^>]*>/gi,
    ],

    // Path Traversal
    path_traversal: [/\.\.(\/|\\)/g, /(\.\.%2f|\.\.%5c)/gi, /(%2e%2e%2f|%2e%2e%5c)/gi],

    // Command Injection
    command_injection: [/[;&|`$()]/g, /(;|\||&&|>|<|\$\(|\`)/g],

    // LDAP Injection
    ldap_injection: [/[*()\\]/g, /(\(|\)|\||&|\*)/g],
};

/**
 * Analyser une chaîne pour détecter des patterns malveillants
 */
function detectThreats(input, paramName = 'unknown') {
    if (!input || typeof input !== 'string') {
        return { threats: [], isMalicious: false };
    }

    const threats = [];

    // Tester chaque catégorie de pattern
    for (const [type, patterns] of Object.entries(ATTACK_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(input)) {
                threats.push({
                    type,
                    pattern: pattern.toString(),
                    paramName,
                    match: input.match(pattern)?.[0],
                });
                break; // Une détection par type suffit
            }
        }
    }

    return {
        threats,
        isMalicious: threats.length > 0,
    };
}

/**
 * Middleware de détection de menaces
 */
function threatDetectionMiddleware(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;

    // Vérifier si l'IP est bannie
    if (ipBanManager.isBanned(ip)) {
        const banInfo = ipBanManager.getBanInfo(ip);
        logger.security.attack('banned_ip_attempt', ip, banInfo);

        return res.status(403).json({
            error: 'Forbidden',
            message: 'Your IP has been banned due to suspicious activity',
            reason: banInfo.reason,
            bannedAt: banInfo.bannedAt,
            expiresAt: banInfo.expiresAt,
        });
    }

    const threatsFound = [];

    // Analyser les paramètres de query
    for (const [key, value] of Object.entries(req.query)) {
        const result = detectThreats(value, `query.${key}`);
        if (result.isMalicious) {
            threatsFound.push(...result.threats);
        }
    }

    // Analyser le body (si présent)
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

    // Analyser les headers suspects
    const suspiciousHeaders = ['user-agent', 'referer', 'x-forwarded-for'];
    for (const header of suspiciousHeaders) {
        const value = req.headers[header];
        if (value) {
            const result = detectThreats(value, `header.${header}`);
            if (result.isMalicious) {
                threatsFound.push(...result.threats);
            }
        }
    }

    // Si des menaces sont détectées
    if (threatsFound.length > 0) {
        const primaryThreat = threatsFound[0].type;

        logger.security.attack(primaryThreat, ip, {
            threats: threatsFound,
            url: req.originalUrl,
            method: req.method,
            userAgent: req.headers['user-agent'],
        });

        // Enregistrer l'activité suspecte et potentiellement bannir
        const shouldBan = ipBanManager.recordSuspiciousActivity(ip, primaryThreat);

        if (shouldBan) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Your IP has been automatically banned due to malicious activity',
            });
        }

        return res.status(400).json({
            error: 'Bad Request',
            message: 'Malicious input detected',
            threats: threatsFound.map(t => ({ type: t.type, param: t.paramName })),
        });
    }

    next();
}

/**
 * Middleware de validation de coordonnées géographiques
 */
function validateCoordinates(req, res, next) {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Missing required parameters: lat, lon',
        });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    // Validation des ranges
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        const ip = req.ip || req.connection.remoteAddress;
        ipBanManager.recordSuspiciousActivity(ip, 'invalid_input');

        return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid latitude (must be between -90 and 90)',
        });
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        const ip = req.ip || req.connection.remoteAddress;
        ipBanManager.recordSuspiciousActivity(ip, 'invalid_input');

        return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid longitude (must be between -180 and 180)',
        });
    }

    // Ajouter les coordonnées validées à req
    req.validatedCoords = { lat: latitude, lon: longitude };

    next();
}

module.exports = {
    threatDetectionMiddleware,
    validateCoordinates,
    detectThreats,
};
