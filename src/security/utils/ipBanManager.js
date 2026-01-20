/**
 * IP Ban Manager - Fail2ban-like System
 *
 * Tracks suspicious IPs and bans them automatically
 * Features:
 * - Automatic banning after threshold
 * - Temporary bans with auto-expiration
 * - Permanent ban list
 * - Threat scoring system
 */

const NodeCache = require('node-cache');
const logger = require('../logger');

class IPBanManager {
    constructor() {
        // Cache for banned IPs (TTL in seconds)
        this.bannedIPs = new NodeCache({
            stdTTL: 3600, // 1 hour default
            checkperiod: 120, // Check for expired entries every 2 minutes
        });

        // Cache for tracking violations per IP
        this.violations = new NodeCache({
            stdTTL: 900, // Violations expire after 15 minutes
        });

        // Permanent ban list (loaded from config or DB)
        this.permanentBans = new Set();

        // Configuration
        this.config = {
            maxViolations: 5, // Max violations before ban
            banDuration: 3600, // Ban duration in seconds (1 hour)
            violationDecay: 900, // Time window for violations (15 min)
            severeBanDuration: 86400, // 24 hours for severe attacks
        };

        // Track statistics
        this.stats = {
            totalBans: 0,
            activeBans: 0,
            blockedRequests: 0,
            topAttackers: new Map(),
        };
    }

    /**
     * Check if an IP is banned
     */
    isBanned(ip) {
        // Check permanent bans first
        if (this.permanentBans.has(ip)) {
            this.stats.blockedRequests++;
            return true;
        }

        // Check temporary bans
        const banInfo = this.bannedIPs.get(ip);
        if (banInfo) {
            this.stats.blockedRequests++;
            return true;
        }

        return false;
    }

    /**
     * Get ban information for an IP
     */
    getBanInfo(ip) {
        if (this.permanentBans.has(ip)) {
            return {
                banned: true,
                permanent: true,
                reason: 'Permanent ban',
                expiresAt: null,
            };
        }

        const banInfo = this.bannedIPs.get(ip);
        if (banInfo) {
            return {
                banned: true,
                permanent: false,
                ...banInfo,
                expiresAt: new Date(Date.now() + this.bannedIPs.getTtl(ip) - Date.now()),
            };
        }

        return { banned: false };
    }

    /**
     * Record a violation for an IP
     */
    recordViolation(ip, violationType, severity = 'medium') {
        // Get current violations
        let ipViolations = this.violations.get(ip) || {
            count: 0,
            types: [],
            firstViolation: Date.now(),
            threatScore: 0,
        };

        // Increment violation count
        ipViolations.count++;
        ipViolations.types.push({
            type: violationType,
            severity,
            timestamp: Date.now(),
        });

        // Calculate threat score
        const severityScores = {
            low: 1,
            medium: 3,
            high: 5,
            critical: 10,
        };
        ipViolations.threatScore += severityScores[severity] || 3;

        // Update violations cache
        this.violations.set(ip, ipViolations);

        // Log the violation
        logger.security.suspicious(ip, violationType, ipViolations.threatScore);

        // Check if IP should be banned
        if (this.shouldBan(ipViolations, severity)) {
            this.banIP(ip, violationType, severity);
        }

        return ipViolations;
    }

    /**
     * Determine if an IP should be banned
     */
    shouldBan(violations, severity) {
        // Immediate ban for critical violations
        if (severity === 'critical') {
            return true;
        }

        // Ban if violation count exceeds threshold
        if (violations.count >= this.config.maxViolations) {
            return true;
        }

        // Ban if threat score is too high
        if (violations.threatScore >= 15) {
            return true;
        }

        return false;
    }

    /**
     * Ban an IP address
     */
    banIP(ip, reason, severity = 'medium', permanent = false) {
        // Determine ban duration based on severity
        let duration = this.config.banDuration;
        if (severity === 'critical' || severity === 'high') {
            duration = this.config.severeBanDuration;
        }

        const banInfo = {
            reason,
            severity,
            bannedAt: new Date().toISOString(),
            violationCount: (this.violations.get(ip) || {}).count || 1,
        };

        if (permanent) {
            this.permanentBans.add(ip);
            logger.security.ban(ip, reason, 'permanent');
        } else {
            this.bannedIPs.set(ip, banInfo, duration);
            logger.security.ban(ip, reason, `${duration}s`);
        }

        // Update statistics
        this.stats.totalBans++;
        this.stats.activeBans = this.bannedIPs.keys().length + this.permanentBans.size;

        // Track top attackers
        const attackCount = this.stats.topAttackers.get(ip) || 0;
        this.stats.topAttackers.set(ip, attackCount + 1);

        // Clear violations for this IP
        this.violations.del(ip);

        return banInfo;
    }

    /**
     * Manually unban an IP
     */
    unbanIP(ip) {
        const wasBanned = this.bannedIPs.has(ip) || this.permanentBans.has(ip);

        this.bannedIPs.del(ip);
        this.permanentBans.delete(ip);
        this.violations.del(ip);

        if (wasBanned) {
            this.stats.activeBans = this.bannedIPs.keys().length + this.permanentBans.size;
            logger.info('IP_UNBANNED', { ip });
        }

        return wasBanned;
    }

    /**
     * Get all banned IPs
     */
    getBannedIPs() {
        const temporary = this.bannedIPs.keys().map(ip => ({
            ip,
            ...this.bannedIPs.get(ip),
            permanent: false,
            ttl: this.bannedIPs.getTtl(ip),
        }));

        const permanent = Array.from(this.permanentBans).map(ip => ({
            ip,
            reason: 'Permanent ban',
            permanent: true,
            ttl: null,
        }));

        return [...temporary, ...permanent];
    }

    /**
     * Get current statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeBans: this.bannedIPs.keys().length + this.permanentBans.size,
            topAttackers: Array.from(this.stats.topAttackers.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([ip, count]) => ({ ip, attacks: count })),
        };
    }

    /**
     * Get violations for an IP
     */
    getViolations(ip) {
        return this.violations.get(ip) || null;
    }

    /**
     * Clear all bans (for testing/admin)
     */
    clearAllBans() {
        const count = this.bannedIPs.keys().length + this.permanentBans.size;
        this.bannedIPs.flushAll();
        this.permanentBans.clear();
        this.violations.flushAll();
        this.stats.activeBans = 0;

        logger.info('ALL_BANS_CLEARED', { count });
        return count;
    }
}

// Export singleton instance
module.exports = new IPBanManager();
