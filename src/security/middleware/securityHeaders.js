/**
 * Security Headers Configuration - Helmet
 *
 * Configure les headers HTTP pour la sécurité
 */

const helmet = require('helmet');

/**
 * Configuration Helmet personnalisée
 */
const helmetConfig = helmet({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://cdn.jsdelivr.net', // Chart.js
                'https://cdnjs.cloudflare.com',
                'https://unpkg.com', // Globe.gl
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Nécessaire pour les styles inline
                'https://fonts.googleapis.com',
            ],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: [
                "'self'",
                'data:', // Pour les images base64
                'https:',
            ],
            connectSrc: [
                "'self'",
                'https://api.open-meteo.com',
                'https://air-quality-api.open-meteo.com',
                'https://currentuvindex.com',
                'https://nominatim.openstreetmap.org',
                'https://cdn.jsdelivr.net', // Chart.js source map
            ],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },

    // Cross-Origin Policies
    crossOriginEmbedderPolicy: false, // Désactivé pour permettre les ressources externes
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    // DNS Prefetch Control
    dnsPrefetchControl: {
        allow: true,
    },

    // Frame Guard (protection contre clickjacking)
    frameguard: {
        action: 'deny',
    },

    // Hide Powered By (cache le header X-Powered-By: Express)
    hidePoweredBy: true,

    // HSTS (HTTP Strict Transport Security)
    hsts: {
        maxAge: 31536000, // 1 an
        includeSubDomains: true,
        preload: true,
    },

    // IE No Open (protection IE)
    ieNoOpen: true,

    // No Sniff (empêche le MIME sniffing)
    noSniff: true,

    // Origin Agent Cluster
    originAgentCluster: true,

    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: {
        permittedPolicies: 'none',
    },

    // Referrer Policy
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
    },

    // XSS Filter (protection XSS pour vieux navigateurs)
    xssFilter: true,
});

/**
 * Headers de sécurité additionnels personnalisés
 */
function additionalSecurityHeaders(req, res, next) {
    // En-tête personnalisé pour identifier l'API
    res.setHeader('X-API-Version', '1.0.0');

    // Rate limit info (sera écrasé par express-rate-limit si utilisé)
    if (!res.getHeader('X-RateLimit-Limit')) {
        res.setHeader('X-RateLimit-Limit', '100');
        res.setHeader('X-RateLimit-Window', '15min');
    }

    // Désactiver le cache pour les endpoints API
    if (req.path.startsWith('/api')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }

    // Security headers additionnels
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    next();
}

module.exports = {
    securityHeaders: helmetConfig,
    customHeaders: additionalSecurityHeaders,
    helmetConfig,
    additionalSecurityHeaders,
};
