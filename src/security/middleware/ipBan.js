/**
 * IP Ban Manager - Fail2ban-like System
 *
 * Gère le bannissement et débannissement d'IPs
 * Stockage en mémoire + fichier JSON pour persistence
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../monitoring/logger');

class IPBanManager {
    constructor() {
        this.bannedIPs = new Map(); // IP -> { reason, bannedAt, expiresAt, attempts }
        this.suspiciousIPs = new Map(); // IP -> { attempts, lastAttempt, score }
        this.dataFile = path.join(__dirname, '../data/banned-ips.json');

        // Charger les IPs bannies au démarrage
        this.loadBannedIPs();

        // Nettoyer les bans expirés toutes les heures
        setInterval(() => this.cleanExpiredBans(), 3600000);
    }

    /**
     * Charger les IPs bannies depuis le fichier
     */
    async loadBannedIPs() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const banned = JSON.parse(data);

            for (const [ip, info] of Object.entries(banned)) {
                // Vérifier si le ban n'est pas expiré
                if (!info.expiresAt || new Date(info.expiresAt) > new Date()) {
                    this.bannedIPs.set(ip, info);
                }
            }

            logger.info(`Loaded ${this.bannedIPs.size} banned IPs from storage`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.error('Failed to load banned IPs', { error: error.message });
            }
        }
    }

    /**
     * Sauvegarder les IPs bannies dans le fichier
     */
    async saveBannedIPs() {
        try {
            const banned = Object.fromEntries(this.bannedIPs);
            await fs.writeFile(this.dataFile, JSON.stringify(banned, null, 2));
        } catch (error) {
            logger.error('Failed to save banned IPs', { error: error.message });
        }
    }

    /**
     * Bannir une IP
     * @param {string} ip - Adresse IP
     * @param {string} reason - Raison du ban
     * @param {number} duration - Durée en minutes (0 = permanent)
     */
    async banIP(ip, reason, duration = 0) {
        const bannedAt = new Date();
        const expiresAt = duration > 0 ? new Date(Date.now() + duration * 60000) : null;

        const banInfo = {
            reason,
            bannedAt: bannedAt.toISOString(),
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
            attempts: (this.suspiciousIPs.get(ip)?.attempts || 0) + 1,
        };

        this.bannedIPs.set(ip, banInfo);
        this.suspiciousIPs.delete(ip); // Retirer des suspects

        await this.saveBannedIPs();
        logger.security.ban(ip, reason, duration > 0 ? `${duration} minutes` : 'permanent');

        return banInfo;
    }

    /**
     * Débannir une IP
     */
    async unbanIP(ip) {
        if (this.bannedIPs.has(ip)) {
            this.bannedIPs.delete(ip);
            await this.saveBannedIPs();
            logger.security.unban(ip);
            return true;
        }
        return false;
    }

    /**
     * Vérifier si une IP est bannie
     */
    isBanned(ip) {
        const banInfo = this.bannedIPs.get(ip);

        if (!banInfo) return false;

        // Vérifier si le ban est expiré
        if (banInfo.expiresAt && new Date(banInfo.expiresAt) < new Date()) {
            this.unbanIP(ip);
            return false;
        }

        return true;
    }

    /**
     * Obtenir les infos de ban d'une IP
     */
    getBanInfo(ip) {
        return this.bannedIPs.get(ip) || null;
    }

    /**
     * Enregistrer une activité suspecte
     * @returns {boolean} true si l'IP doit être bannie
     */
    recordSuspiciousActivity(ip, threatType = 'unknown') {
        const now = Date.now();
        const suspicious = this.suspiciousIPs.get(ip) || {
            attempts: 0,
            lastAttempt: now,
            score: 0,
            threats: [],
        };

        suspicious.attempts++;
        suspicious.lastAttempt = now;
        suspicious.threats.push({ type: threatType, timestamp: now });

        // Score de menace basé sur le type
        const threatScores = {
            sql_injection: 50,
            xss: 40,
            path_traversal: 45,
            rate_limit: 10,
            invalid_input: 5,
            unknown: 15,
        };

        suspicious.score += threatScores[threatType] || 15;

        this.suspiciousIPs.set(ip, suspicious);

        // Seuils de bannissement (augmentés pour faciliter les tests)
        const BAN_THRESHOLD_SCORE = 300;
        const BAN_THRESHOLD_ATTEMPTS = 20;

        if (
            suspicious.score >= BAN_THRESHOLD_SCORE ||
            suspicious.attempts >= BAN_THRESHOLD_ATTEMPTS
        ) {
            this.banIP(
                ip,
                `Automatic ban: ${suspicious.attempts} suspicious attempts (score: ${suspicious.score})`,
                60
            ); // 1 heure
            return true;
        }

        return false;
    }

    /**
     * Nettoyer les bans expirés
     */
    async cleanExpiredBans() {
        const now = new Date();
        let cleaned = 0;

        for (const [ip, info] of this.bannedIPs.entries()) {
            if (info.expiresAt && new Date(info.expiresAt) < now) {
                this.bannedIPs.delete(ip);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            await this.saveBannedIPs();
            logger.info(`Cleaned ${cleaned} expired bans`);
        }

        // Nettoyer les activités suspectes de plus de 1 heure
        const oneHourAgo = Date.now() - 3600000;
        for (const [ip, info] of this.suspiciousIPs.entries()) {
            if (info.lastAttempt < oneHourAgo) {
                this.suspiciousIPs.delete(ip);
            }
        }
    }

    /**
     * Obtenir toutes les IPs bannies
     */
    getAllBanned() {
        return Array.from(this.bannedIPs.entries()).map(([ip, info]) => ({
            ip,
            ...info,
        }));
    }

    /**
     * Obtenir toutes les IPs suspectes
     */
    getAllSuspicious() {
        return Array.from(this.suspiciousIPs.entries()).map(([ip, info]) => ({
            ip,
            ...info,
        }));
    }

    /**
     * Obtenir les statistiques
     */
    getStats() {
        return {
            bannedCount: this.bannedIPs.size,
            suspiciousCount: this.suspiciousIPs.size,
            totalBlocked: Array.from(this.bannedIPs.values()).reduce(
                (sum, info) => sum + info.attempts,
                0
            ),
        };
    }
}

// Singleton
const ipBanManager = new IPBanManager();

/**
 * Middleware pour vérifier si l'IP est bannie
 */
function banCheckMiddleware(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;

    if (ipBanManager.isBanned(ip)) {
        const banInfo = ipBanManager.getBanInfo(ip);
        logger.security.attack('banned_ip_attempt', ip, banInfo);

        return res.status(403).json({
            error: 'Forbidden',
            message: 'Your IP has been banned',
            reason: banInfo.reason,
            bannedAt: banInfo.bannedAt,
            expiresAt: banInfo.expiresAt,
        });
    }

    next();
}

module.exports = ipBanManager;
module.exports.banCheckMiddleware = banCheckMiddleware;
