/**
 * Weather Aggregator API Server - SECURE VERSION
 *
 * Express server with comprehensive security features:
 * - Helmet (security headers)
 * - IP banning system (fail2ban-like)
 * - Advanced rate limiting
 * - Attack detection (SQL injection, XSS, etc.)
 * - Request logging (Winston)
 * - Security monitoring dashboard
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
const logger = require('./security/monitoring/logger');
const { analytics } = require('./security/monitoring/analytics');

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
        origin: process.env.CORS_ORIGIN || '*',
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
// Apply moderate rate limiting to all API routes
app.use('/api/weather', moderateLimiter);
app.use('/api/forecast', moderateLimiter);

// Apply rate limiting to security routes (whitelist dashboard endpoints)
app.use('/api/security', (req, res, next) => {
    // Dashboard endpoints = pas de rate limit strict (auto-refresh toutes les 5s)
    const dashboardEndpoints = ['/stats', '/events', '/banned-ips', '/suspicious-ips'];

    const isDashboard = dashboardEndpoints.some(endpoint => req.path.startsWith(endpoint));

    if (isDashboard) {
        return next(); // Skip strict rate limiting for dashboard
    }

    // Autres endpoints = strict rate limit
    return strictLimiter(req, res, next);
});

// ====================
// ROUTES
// ====================

// Weather API routes
app.use('/api', require('./routes/weather'));

// Security monitoring routes
app.use('/api/security', require('./security/routes/securityRoutes'));

// Security dashboard (HTML page)
app.get('/admin/security', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

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
app.use((err, req, res, next) => {
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
const server = app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   WEATHER AGGREGATOR API - SECURE SERVER    ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`⏱️  Cache TTL: ${process.env.CACHE_TTL || 300} seconds`);
    console.log('');
    console.log('🛡️  SECURITY FEATURES ENABLED:');
    console.log('   ✅ Helmet (Security Headers)');
    console.log('   ✅ IP Banning System (Fail2ban-like)');
    console.log('   ✅ Advanced Rate Limiting');
    console.log('   ✅ Attack Detection (SQL, XSS, Path Traversal)');
    console.log('   ✅ Request Logging (Winston)');
    console.log('   ✅ Pattern Analysis');
    console.log('');
    console.log(`📊 Security Dashboard: http://localhost:${PORT}/admin/security`);
    console.log(`📋 API Documentation: http://localhost:${PORT}/api/security/health`);
    console.log('══════════════════════════════════════════════');

    logger.info('Server started successfully', {
        port: PORT,
        environment: NODE_ENV,
    });
});

// ====================
// GRACEFUL SHUTDOWN
// ====================
process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM signal received: closing HTTP server');
    logger.info('Server shutting down...');

    server.close(() => {
        console.log('✅ HTTP server closed');
        logger.info('Server shut down successfully');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT signal received: closing HTTP server');
    logger.info('Server shutting down...');

    server.close(() => {
        console.log('✅ HTTP server closed');
        logger.info('Server shut down successfully');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
    console.error('❌ Uncaught Exception:', error);
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    logger.error('Unhandled Rejection', {
        reason: reason,
    });
});

module.exports = app;
