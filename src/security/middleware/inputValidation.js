/**
 * Input Validation & Attack Detection Middleware
 *
 * Detects and blocks common attack patterns:
 * - SQL Injection
 * - XSS (Cross-Site Scripting)
 * - Path Traversal
 * - Command Injection
 * - LDAP Injection
 */

const { query, param, validationResult } = require('express-validator');
const ipBanManager = require('../utils/ipBanManager');
const logger = require('../logger');

/**
 * Attack pattern detection rules
 */
const attackPatterns = {
    sqlInjection: [
        /(\bUNION\b.*\bSELECT\b)/gi,
        /(\bSELECT\b.*\bFROM\b)/gi,
        /(\bINSERT\b.*\bINTO\b)/gi,
        /(\bDELETE\b.*\bFROM\b)/gi,
        /(\bDROP\b.*\bTABLE\b)/gi,
        /(\bUPDATE\b.*\bSET\b)/gi,
        /(\'|\").*(\bOR\b|\bAND\b).*(\=|\'|\")/gi,
        /(\-\-|\/\*|\*\/|;)/g,
        /(0x[0-9a-f]+)/gi,
    ],

    xss: [
        /<script[^>]*>.*<\/script>/gi,
        /<iframe[^>]*>.*<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // Event handlers like onclick=
        /<img[^>]+src[^>]*>/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi,
    ],

    pathTraversal: [
        /\.\.[\/\\]/g,
        /%2e%2e[\/\\]/gi,
        /\.\.[%2f%5c]/gi,
        /(\/etc\/passwd|\/etc\/shadow)/gi,
        /\\windows\\system32/gi,
    ],

    commandInjection: [
        /[;&|`$(){}[\]<>]/g,
        /\$\(.*\)/g,
        /`.*`/g,
        /(cat|ls|wget|curl|nc|bash|sh)\s/gi,
    ],

    ldapInjection: [/[*()\\]/g, /\|\|/g, /&&/g],
};

/**
 * Detect attack patterns in input
 */
function detectAttack(input) {
    if (!input || typeof input !== 'string') {
        return null;
    }

    // Check each attack type
    for (const [attackType, patterns] of Object.entries(attackPatterns)) {
        for (const pattern of patterns) {
            if (pattern.test(input)) {
                return {
                    type: attackType,
                    pattern: pattern.toString(),
                    matched: input.match(pattern)?.[0],
                };
            }
        }
    }

    return null;
}

/**
 * Scan request for malicious patterns
 */
function scanRequest(req) {
    const attacks = [];

    // Scan query parameters
    for (const [key, value] of Object.entries(req.query)) {
        const attack = detectAttack(String(value));
        if (attack) {
            attacks.push({
                location: 'query',
                parameter: key,
                value: String(value).substring(0, 100),
                ...attack,
            });
        }
    }

    // Scan URL parameters
    for (const [key, value] of Object.entries(req.params)) {
        const attack = detectAttack(String(value));
        if (attack) {
            attacks.push({
                location: 'params',
                parameter: key,
                value: String(value).substring(0, 100),
                ...attack,
            });
        }
    }

    // Scan request body
    if (req.body && typeof req.body === 'object') {
        for (const [key, value] of Object.entries(req.body)) {
            if (typeof value === 'string') {
                const attack = detectAttack(value);
                if (attack) {
                    attacks.push({
                        location: 'body',
                        parameter: key,
                        value: value.substring(0, 100),
                        ...attack,
                    });
                }
            }
        }
    }

    // Scan headers (User-Agent, Referer, etc.)
    const suspiciousHeaders = ['user-agent', 'referer', 'x-forwarded-for'];
    for (const header of suspiciousHeaders) {
        const value = req.headers[header];
        if (value) {
            const attack = detectAttack(String(value));
            if (attack) {
                attacks.push({
                    location: 'headers',
                    parameter: header,
                    value: String(value).substring(0, 100),
                    ...attack,
                });
            }
        }
    }

    return attacks;
}

/**
 * Attack detection middleware
 */
function attackDetection(req, res, next) {
    const attacks = scanRequest(req);

    if (attacks.length > 0) {
        const ip = req.clientIP || req.ip;

        // Log the attack
        logger.security.attack(ip, attacks[0].type, {
            path: req.path,
            method: req.method,
            attacks: attacks.length,
            details: attacks,
        });

        // Determine severity based on attack type
        const severityMap = {
            sqlInjection: 'critical',
            commandInjection: 'critical',
            xss: 'high',
            pathTraversal: 'high',
            ldapInjection: 'medium',
        };

        const severity = severityMap[attacks[0].type] || 'high';

        // Record violation
        ipBanManager.recordViolation(ip, attacks[0].type, severity);

        // Block the request
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Your request contains potentially malicious content.',
            code: 'MALICIOUS_INPUT_DETECTED',
            hint: 'Please check your input and try again.',
        });
    }

    next();
}

/**
 * Validation rules for weather API
 */
const weatherValidation = [
    query('lat')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),

    query('lon')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),

    query('city')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('City name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s\-àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]+$/)
        .withMessage('City name contains invalid characters'),
];

/**
 * Handle validation errors
 */
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const ip = req.clientIP || req.ip;

        // Log validation failure
        logger.warn('VALIDATION_FAILED', {
            ip,
            path: req.path,
            errors: errors.array(),
        });

        // Record minor violation
        ipBanManager.recordViolation(ip, 'invalid_input', 'low');

        return res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid request parameters',
            errors: errors.array().map(err => ({
                param: err.param,
                message: err.msg,
            })),
        });
    }

    next();
}

module.exports = {
    attackDetection,
    weatherValidation,
    handleValidationErrors,
    detectAttack,
};
