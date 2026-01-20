/**
 * Security API Routes
 *
 * Endpoints for security dashboard:
 * - /api/security/stats - Get security statistics
 * - /api/security/banned-ips - List banned IPs
 * - /api/security/events - Recent security events
 * - /api/security/unban/:ip - Unban an IP
 */

const express = require('express');
const router = express.Router();
const ipBanManager = require('../utils/ipBanManager');
const logger = require('../logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * GET /api/security/stats
 * Get current security statistics
 */
router.get('/stats', (req, res) => {
    try {
        const stats = ipBanManager.getStats();

        res.json({
            success: true,
            data: {
                ...stats,
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error('Error fetching security stats', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch security statistics',
        });
    }
});

/**
 * GET /api/security/banned-ips
 * Get list of all banned IPs
 */
router.get('/banned-ips', (req, res) => {
    try {
        const bannedIPs = ipBanManager.getBannedIPs();

        res.json({
            success: true,
            count: bannedIPs.length,
            data: bannedIPs,
        });
    } catch (error) {
        logger.error('Error fetching banned IPs', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch banned IPs',
        });
    }
});

/**
 * GET /api/security/events
 * Get recent security events from logs
 */
router.get('/events', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const type = req.query.type; // Filter by event type

        // Read the most recent security log file
        const logsDir = path.join(__dirname, '../../logs');
        const files = await fs.readdir(logsDir);

        // Find security log files
        const securityLogs = files
            .filter(f => f.startsWith('security-'))
            .sort()
            .reverse();

        if (securityLogs.length === 0) {
            return res.json({
                success: true,
                count: 0,
                data: [],
            });
        }

        // Read the most recent log file
        const logPath = path.join(logsDir, securityLogs[0]);
        const content = await fs.readFile(logPath, 'utf-8');

        // Parse log entries (each line is a JSON object)
        const events = content
            .trim()
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            })
            .filter(event => event !== null)
            .filter(event => !type || event.message === type)
            .slice(0, limit);

        res.json({
            success: true,
            count: events.length,
            data: events,
        });
    } catch (error) {
        logger.error('Error fetching security events', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch security events',
        });
    }
});

/**
 * POST /api/security/unban/:ip
 * Manually unban an IP address
 */
router.post('/unban/:ip', (req, res) => {
    try {
        const ip = req.params.ip;

        // Validate IP format
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(ip)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid IP address format',
            });
        }

        // Unban the IP
        const wasBanned = ipBanManager.unbanIP(ip);

        if (wasBanned) {
            logger.info('IP_MANUALLY_UNBANNED', {
                ip,
                unbannedBy: req.clientIP || req.ip,
            });

            res.json({
                success: true,
                message: `IP ${ip} has been unbanned`,
                data: { ip },
            });
        } else {
            res.status(404).json({
                error: 'Not Found',
                message: `IP ${ip} is not currently banned`,
            });
        }
    } catch (error) {
        logger.error('Error unbanning IP', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to unban IP',
        });
    }
});

/**
 * GET /api/security/violations/:ip
 * Get violation history for a specific IP
 */
router.get('/violations/:ip', (req, res) => {
    try {
        const ip = req.params.ip;
        const violations = ipBanManager.getViolations(ip);
        const banInfo = ipBanManager.getBanInfo(ip);

        res.json({
            success: true,
            data: {
                ip,
                violations,
                banInfo,
            },
        });
    } catch (error) {
        logger.error('Error fetching IP violations', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch violations',
        });
    }
});

/**
 * DELETE /api/security/clear-bans
 * Clear all bans (admin only - use with caution)
 */
router.delete('/clear-bans', (req, res) => {
    try {
        const count = ipBanManager.clearAllBans();

        logger.warn('ALL_BANS_CLEARED', {
            count,
            clearedBy: req.clientIP || req.ip,
        });

        res.json({
            success: true,
            message: `Cleared ${count} banned IPs`,
            count,
        });
    } catch (error) {
        logger.error('Error clearing bans', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to clear bans',
        });
    }
});

module.exports = router;
