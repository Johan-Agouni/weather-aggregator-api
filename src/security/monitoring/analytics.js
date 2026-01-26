/**
 * Security Analytics & Monitoring
 *
 * Collecte et analyse les métriques de sécurité
 */

const ipBanManager = require('../middleware/ipBan');

class SecurityAnalytics {
    constructor() {
        this.metrics = {
            requests: {
                total: 0,
                blocked: 0,
                suspicious: 0,
                byEndpoint: new Map(),
            },
            threats: {
                sql_injection: 0,
                xss: 0,
                path_traversal: 0,
                command_injection: 0,
                rate_limit: 0,
                invalid_input: 0,
            },
            performance: {
                avgResponseTime: 0,
                requestTimes: [],
            },
        };

        // Timeline doit être une propriété directe, pas dans metrics
        this.timeline = [];

        this.startTime = Date.now();

        // Nettoyer les anciennes données de timeline toutes les heures
        setInterval(() => this.cleanTimeline(), 3600000);
    }

    /**
     * Enregistrer une requête
     */
    recordRequest(req, blocked = false, suspicious = false) {
        this.metrics.requests.total++;

        if (blocked) this.metrics.requests.blocked++;
        if (suspicious) this.metrics.requests.suspicious++;

        // Par endpoint
        const endpoint = req.path;
        const count = this.metrics.requests.byEndpoint.get(endpoint) || 0;
        this.metrics.requests.byEndpoint.set(endpoint, count + 1);

        // Timeline
        this.addToTimeline({
            type: blocked ? 'blocked' : suspicious ? 'suspicious' : 'normal',
            ip: req.ip,
            endpoint,
            method: req.method,
            timestamp: Date.now(),
        });
    }

    /**
     * Enregistrer une menace détectée
     */
    recordThreat(threatType, ip, details = {}) {
        if (this.metrics.threats[threatType] !== undefined) {
            this.metrics.threats[threatType]++;
        }

        this.addToTimeline({
            type: 'threat',
            threatType,
            ip,
            details,
            timestamp: Date.now(),
        });
    }

    /**
     * Enregistrer le temps de réponse
     */
    recordResponseTime(ms) {
        this.metrics.performance.requestTimes.push(ms);

        // Garder seulement les 1000 dernières
        if (this.metrics.performance.requestTimes.length > 1000) {
            this.metrics.performance.requestTimes.shift();
        }

        // Calculer la moyenne
        const sum = this.metrics.performance.requestTimes.reduce((a, b) => a + b, 0);
        this.metrics.performance.avgResponseTime = Math.round(
            sum / this.metrics.performance.requestTimes.length
        );
    }

    /**
     * Ajouter un événement à la timeline
     */
    addToTimeline(event) {
        this.timeline.push(event);

        // Garder seulement les 500 derniers événements
        if (this.timeline.length > 500) {
            this.timeline.shift();
        }
    }

    /**
     * Nettoyer les événements de plus de 24h
     */
    cleanTimeline() {
        const oneDayAgo = Date.now() - 86400000;
        this.timeline = this.timeline.filter(event => event.timestamp > oneDayAgo);
    }

    /**
     * Obtenir les statistiques globales
     */
    getStats() {
        const uptime = Date.now() - this.startTime;
        const bannedStats = ipBanManager.getStats();

        return {
            uptime: {
                ms: uptime,
                formatted: this.formatUptime(uptime),
            },
            requests: {
                total: this.metrics.requests.total,
                blocked: this.metrics.requests.blocked,
                suspicious: this.metrics.requests.suspicious,
                normal:
                    this.metrics.requests.total -
                    this.metrics.requests.blocked -
                    this.metrics.requests.suspicious,
                requestsPerSecond: this.calculateRPS(),
            },
            threats: { ...this.metrics.threats },
            bans: bannedStats,
            performance: {
                avgResponseTime: this.metrics.performance.avgResponseTime,
                totalSamples: this.metrics.performance.requestTimes.length,
            },
            topEndpoints: this.getTopEndpoints(5),
        };
    }

    /**
     * Obtenir les événements récents
     */
    getRecentEvents(limit = 50) {
        return this.timeline.slice(-limit).reverse();
    }

    /**
     * Obtenir les top endpoints
     */
    getTopEndpoints(limit = 5) {
        return Array.from(this.metrics.requests.byEndpoint.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([endpoint, count]) => ({ endpoint, count }));
    }

    /**
     * Calculer les requêtes par seconde
     */
    calculateRPS() {
        const uptimeSeconds = (Date.now() - this.startTime) / 1000;
        return uptimeSeconds > 0 ? (this.metrics.requests.total / uptimeSeconds).toFixed(2) : 0;
    }

    /**
     * Formater l'uptime
     */
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Exporter les métriques (pour logging/monitoring externe)
     */
    exportMetrics() {
        return {
            timestamp: new Date().toISOString(),
            stats: this.getStats(),
            bannedIPs: ipBanManager.getAllBanned(),
            suspiciousIPs: ipBanManager.getAllSuspicious(),
        };
    }
}

// Singleton
const analytics = new SecurityAnalytics();

/**
 * Middleware pour tracker les requêtes
 */
function analyticsMiddleware(req, res, next) {
    const startTime = Date.now();

    // Enregistrer la requête
    analytics.recordRequest(req);

    // Enregistrer le temps de réponse quand la réponse est envoyée
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        analytics.recordResponseTime(responseTime);
    });

    next();
}

module.exports = {
    analytics,
    analyticsMiddleware,
};
