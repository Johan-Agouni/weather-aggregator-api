/**
 * Security Dashboard API Routes
 *
 * Routes pour le dashboard de monitoring de sécurité
 */

const express = require('express');
const router = express.Router();
const ipBanManager = require('../middleware/ipBan');
const { analytics } = require('../monitoring/analytics');
const logger = require('../monitoring/logger');

/**
 * GET /api/security/stats
 * Obtenir les statistiques globales
 */
router.get('/stats', (req, res) => {
    try {
        const stats = analytics.getStats();
        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        logger.error('Failed to get security stats', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics',
        });
    }
});

/**
 * GET /api/security/events
 * Obtenir les événements récents
 */
router.get('/events', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const events = analytics.getRecentEvents(limit);

        res.json({
            success: true,
            data: {
                events,
                count: events.length,
            },
        });
    } catch (error) {
        logger.error('Failed to get security events', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve events',
        });
    }
});

/**
 * GET /api/security/banned-ips
 * Obtenir la liste des IPs bannies
 */
router.get('/banned-ips', (req, res) => {
    try {
        const bannedIPs = ipBanManager.getAllBanned();

        res.json({
            success: true,
            data: {
                bannedIPs,
                count: bannedIPs.length,
            },
        });
    } catch (error) {
        logger.error('Failed to get banned IPs', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve banned IPs',
        });
    }
});

/**
 * GET /api/security/suspicious-ips
 * Obtenir la liste des IPs suspectes
 */
router.get('/suspicious-ips', (req, res) => {
    try {
        const suspiciousIPs = ipBanManager.getAllSuspicious();

        res.json({
            success: true,
            data: {
                suspiciousIPs,
                count: suspiciousIPs.length,
            },
        });
    } catch (error) {
        logger.error('Failed to get suspicious IPs', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve suspicious IPs',
        });
    }
});

/**
 * POST /api/security/unban/:ip
 * Débannir une IP (pour tests/démo)
 */
router.post('/unban/:ip', async (req, res) => {
    try {
        const { ip } = req.params;

        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'IP address required',
            });
        }

        const unbanned = await ipBanManager.unbanIP(ip);

        if (unbanned) {
            res.json({
                success: true,
                message: `IP ${ip} has been unbanned`,
                data: { ip },
            });
        } else {
            res.status(404).json({
                success: false,
                error: `IP ${ip} is not banned`,
            });
        }
    } catch (error) {
        logger.error('Failed to unban IP', { error: error.message, ip: req.params.ip });
        res.status(500).json({
            success: false,
            error: 'Failed to unban IP',
        });
    }
});

/**
 * POST /api/security/ban
 * Bannir une IP manuellement (pour tests)
 */
router.post('/ban', async (req, res) => {
    try {
        const { ip, reason, duration } = req.body;

        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'IP address required',
            });
        }

        // Validate IP format (IPv4 or IPv6)
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
        if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip) && ip !== '::1') {
            return res.status(400).json({
                success: false,
                error: 'Invalid IP address format',
            });
        }

        // Validate duration if provided
        const banDuration = Number(duration) || 0;
        if (banDuration < 0) {
            return res.status(400).json({
                success: false,
                error: 'Duration must be a positive number (minutes)',
            });
        }

        const banInfo = await ipBanManager.banIP(ip, reason || 'Manual ban', banDuration);

        res.json({
            success: true,
            message: `IP ${ip} has been banned`,
            data: { ip, ...banInfo },
        });
    } catch (error) {
        logger.error('Failed to ban IP', { error: error.message, body: req.body });
        res.status(500).json({
            success: false,
            error: 'Failed to ban IP',
        });
    }
});

/**
 * GET /api/security/check/:ip
 * Vérifier le statut d'une IP
 */
router.get('/check/:ip', (req, res) => {
    try {
        const { ip } = req.params;

        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'IP address required',
            });
        }

        const isBanned = ipBanManager.isBanned(ip);
        const banInfo = ipBanManager.getBanInfo(ip);
        const suspicious = ipBanManager.suspiciousIPs?.get(ip);

        res.json({
            success: true,
            data: {
                ip,
                status: isBanned ? 'banned' : suspicious ? 'suspicious' : 'clean',
                banned: isBanned,
                banInfo: banInfo || null,
                suspicious: suspicious || null,
            },
        });
    } catch (error) {
        logger.error('Failed to check IP status', { error: error.message, ip: req.params.ip });
        res.status(500).json({
            success: false,
            error: 'Failed to check IP status',
        });
    }
});

/**
 * GET /api/security/export
 * Exporter toutes les métriques (pour backup/analysis)
 */
router.get('/export', (req, res) => {
    try {
        const metrics = analytics.exportMetrics();

        res.json({
            success: true,
            data: metrics,
        });
    } catch (error) {
        logger.error('Failed to export metrics', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to export metrics',
        });
    }
});

module.exports = router;
