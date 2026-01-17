/**
 * AtmoSphere API Server - SECURE VERSION
 *
 * Express server with comprehensive security features:
 * - Helmet (security headers)
 * - IP banning system (fail2ban-like)
 * - Advanced rate limiting
 * - Attack detection (SQL injection, XSS, etc.)
 * - Request logging (Winston)
 * - Security monitoring dashboard with authentication
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Security middleware
const { securityHeaders, customHeaders } = require('./security/middleware/securityHeaders');
const { banCheckMiddleware } = require('./security/middleware/ipBan');
const {
    attackDetectionMiddleware,
    suspiciousUserAgentMiddleware,
    noUserAgentMiddleware,
} = require('./security/middleware/attackDetection');
const {
    moderateLimiter,
    strictLimiter,
    patternAnalysisMiddleware,
} = require('./security/middleware/rateLimiting');
const { dashboardAuth } = require('./security/middleware/dashboardAuth');
const logger = require('./security/monitoring/logger');
const { analytics } = require('./security/monitoring/analytics');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ====================
// SECURITY MIDDLEWARE (Order matters!)
// ====================

// 1. Trust proxy (for getting real IP behind reverse proxy)
app.set('trust proxy', 1);

// 2. Security headers (Helmet + custom)
app.use(securityHeaders);
app.use(customHeaders);

// 3. CORS (configured for security)
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || (NODE_ENV === 'production' ? false : true),
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        maxAge: 86400, // 24 hours
    })
);

// 4. Body parsing
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Request logging & analytics
app.use((req, res, next) => {
    const start = Date.now();

    // Skip dashboard endpoints from analytics (to avoid inflating stats)
    const dashboardEndpoints = [
        '/api/security/stats',
        '/api/security/events',
        '/api/security/banned-ips',
        '/api/security/suspicious-ips',
    ];
    const isDashboard = dashboardEndpoints.some(endpoint => req.path.startsWith(endpoint));

    res.on('finish', () => {
        const duration = Date.now() - start;

        // Log HTTP request
        logger.logHTTP(req, res, duration);

        // Track in analytics (skip dashboard endpoints)
        if (!isDashboard && !req.path.match(/\.(css|js|png|jpg|ico)$/)) {
            // Determine request type
            const blocked = res.statusCode === 403;
            const suspicious = res.statusCode === 400 || res.statusCode === 429;

            // Track request
            analytics.recordRequest(req, blocked, suspicious);
            analytics.recordResponseTime(duration);
        }
    });

    next();
});

// 6. IP ban check (must be early, but whitelist dashboard & unban endpoints)
app.use((req, res, next) => {
    // Whitelist dashboard endpoints + unban pour éviter que le dashboard se bannisse
    const whitelistedPaths = [
        '/api/security/unban/',
        '/api/security/stats',
        '/api/security/events',
        '/api/security/banned-ips',
        '/api/security/suspicious-ips',
    ];

    if (whitelistedPaths.some(path => req.path.startsWith(path))) {
        return next(); // Skip ban check for dashboard
    }

    return banCheckMiddleware(req, res, next);
});

// 7. Pattern analysis (detect abnormal behavior)
app.use(patternAnalysisMiddleware);

// 8. User agent checks
app.use(noUserAgentMiddleware);
app.use(suspiciousUserAgentMiddleware);

// 9. Attack detection (SQL injection, XSS, etc.)
app.use(attackDetectionMiddleware);

// ====================
// STATIC FILES
// ====================
app.use(express.static(path.join(__dirname, '../public')));

// ====================
// RATE LIMITING
// ====================
// Apply moderate rate limiting to weather API routes
app.use('/api/weather', moderateLimiter);
app.use('/api/forecast', moderateLimiter);

// Dashboard rate limiter (generous but present)
const dashboardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests to dashboard', message: 'Please try again later' },
});

// Apply rate limiting and authentication to security routes
app.use('/api/security', dashboardLimiter, dashboardAuth);

// Apply strict rate limiting to non-dashboard security endpoints (ban/unban actions)
app.use('/api/security/ban', strictLimiter);
app.use('/api/security/unban', strictLimiter);

// ====================
// ROUTES
// ====================

// Weather API routes
app.use('/api', require('./routes/weather'));

// Security monitoring routes
app.use('/api/security', require('./security/routes/securityRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        security: {
            helmet: 'active',
            ipBanning: 'active',
            rateLimit: 'active',
            attackDetection: 'active',
        },
    });
});

// ====================
// ERROR HANDLERS
// ====================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    logger.warn(`404 - Not Found: ${req.originalUrl} from ${ip}`);

    res.status(404).json({
        error: 'Not Found',
        message: 'API endpoint not found',
        path: req.originalUrl,
    });
});

// Global error handler
app.use((err, req, res, _next) => {
    const ip = req.ip || req.connection.remoteAddress;

    logger.error('Server error:', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip,
    });

    res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message:
            process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    });
});

// ====================
// START SERVER
// ====================
if (require.main === module) {
    const server = app.listen(PORT, () => {
        logger.info('Server started successfully', {
            port: PORT,
            environment: NODE_ENV,
            cacheTTL: process.env.CACHE_TTL || 300,
            dashboard: `http://localhost:${PORT}/admin/`,
        });
    });

    // ====================
    // GRACEFUL SHUTDOWN
    // ====================
    process.on('SIGTERM', () => {
        logger.info('SIGTERM signal received: closing HTTP server');
        server.close(() => {
            logger.info('Server shut down successfully');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        logger.info('SIGINT signal received: closing HTTP server');
        server.close(() => {
            logger.info('Server shut down successfully');
            process.exit(0);
        });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
        logger.error('Uncaught Exception', {
            error: error.message,
            stack: error.stack,
        });
        process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, _promise) => {
        logger.error('Unhandled Rejection', { reason });
    });
}

module.exports = app;
