/**
 * Dashboard Authentication Middleware
 *
 * HTTP Basic Authentication pour le security dashboard.
 * Utilise les variables DASHBOARD_USERNAME et DASHBOARD_PASSWORD du .env.
 * Si non configuré, l'accès est libre (mode développement).
 */

const crypto = require('crypto');
const logger = require('../monitoring/logger');

function dashboardAuth(req, res, next) {
    const username = process.env.DASHBOARD_USERNAME;
    const password = process.env.DASHBOARD_PASSWORD;

    if (!username || !password) {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Security Dashboard"');
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Valid credentials are required to access the security dashboard',
        });
    }

    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
    const separatorIndex = decoded.indexOf(':');

    if (separatorIndex === -1) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Security Dashboard"');
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const providedUser = decoded.slice(0, separatorIndex);
    const providedPass = decoded.slice(separatorIndex + 1);

    const userBuffer = Buffer.from(providedUser);
    const passBuffer = Buffer.from(providedPass);
    const expectedUserBuffer = Buffer.from(username);
    const expectedPassBuffer = Buffer.from(password);

    const userMatch =
        userBuffer.length === expectedUserBuffer.length &&
        crypto.timingSafeEqual(userBuffer, expectedUserBuffer);
    const passMatch =
        passBuffer.length === expectedPassBuffer.length &&
        crypto.timingSafeEqual(passBuffer, expectedPassBuffer);

    if (userMatch && passMatch) {
        return next();
    }

    const ip = req.ip || req.connection.remoteAddress;
    logger.warn('Failed dashboard authentication attempt', { ip, path: req.originalUrl });

    res.setHeader('WWW-Authenticate', 'Basic realm="Security Dashboard"');
    return res.status(401).json({ error: 'Invalid credentials' });
}

module.exports = { dashboardAuth };
