/**
 * AtmoSphere — Security Dashboard Frontend Logic
 *
 * Gère l'affichage du dashboard de sécurité
 */

// Variables globales
let trafficChart = null;
let autoRefreshInterval = null;
const AUTO_REFRESH_INTERVAL = 5000; // 5 secondes

// ====================
// INITIALIZATION
// ====================
window.addEventListener('load', () => {
    console.log('[SECURITY DASHBOARD] Initializing...');

    // Charger les données initiales
    loadDashboardData();

    // Démarrer l'auto-refresh
    startAutoRefresh();

    // Setup event listeners
    document.getElementById('refreshBtn').addEventListener('click', loadDashboardData);

    console.log('[SECURITY DASHBOARD] Ready');
});

// ====================
// AUTO REFRESH
// ====================
function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        loadDashboardData(true); // silent = true (pas de loading indicator)
    }, AUTO_REFRESH_INTERVAL);

    document.getElementById('autoRefreshStatus').textContent = 'ON';
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    document.getElementById('autoRefreshStatus').textContent = 'OFF';
}

// ====================
// DATA LOADING
// ====================
async function loadDashboardData(silent = false) {
    if (!silent) {
        showLoading();
    }

    try {
        // Charger toutes les données en parallèle
        const [stats, events, bannedIPs, suspiciousIPs] = await Promise.all([
            fetchStats(),
            fetchEvents(),
            fetchBannedIPs(),
            fetchSuspiciousIPs()
        ]);

        // Mettre à jour l'interface
        updateStatsDisplay(stats);
        updateThreatsDisplay(stats.threats);
        updatePerformanceDisplay(stats.performance);
        updateTrafficChart(stats.requests);
        updateBannedIPsList(bannedIPs);
        updateSuspiciousIPsList(suspiciousIPs);
        updateEventsList(events);

        console.log('[DASHBOARD] Data updated successfully');
    } catch (error) {
        console.error('[DASHBOARD ERROR]', error);
        showError('Failed to load dashboard data');
    } finally {
        if (!silent) {
            hideLoading();
        }
    }
}

// ====================
// API CALLS
// ====================
async function fetchStats() {
    const response = await fetch('/api/security/stats');
    if (!response.ok) throw new Error('Failed to fetch stats');
    const data = await response.json();
    return data.data;
}

async function fetchEvents() {
    const response = await fetch('/api/security/events?limit=50');
    if (!response.ok) throw new Error('Failed to fetch events');
    const data = await response.json();
    return data.data.events;
}

async function fetchBannedIPs() {
    const response = await fetch('/api/security/banned-ips');
    if (!response.ok) throw new Error('Failed to fetch banned IPs');
    const data = await response.json();
    return data.data.bannedIPs;
}

async function fetchSuspiciousIPs() {
    const response = await fetch('/api/security/suspicious-ips');
    if (!response.ok) throw new Error('Failed to fetch suspicious IPs');
    const data = await response.json();
    return data.data.suspiciousIPs;
}

async function unbanIP(ip) {
    try {
        const response = await fetch(`/api/security/unban/${ip}`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Failed to unban IP');

        const data = await response.json();
        console.log(`[UNBAN] ${ip} unbanned successfully`);

        // Recharger les données
        loadDashboardData();

        return data;
    } catch (error) {
        console.error('[UNBAN ERROR]', error);
        throw error;
    }
}

// ====================
// UI UPDATES
// ====================
function updateStatsDisplay(stats) {
    // Total Requests
    document.getElementById('totalRequests').textContent = formatNumber(stats.requests.total);
    document.getElementById('requestsPerSec').textContent = stats.requests.requestsPerSecond;

    // Blocked
    document.getElementById('blockedRequests').textContent = formatNumber(stats.requests.blocked);

    // Suspicious
    document.getElementById('suspiciousRequests').textContent = formatNumber(stats.requests.suspicious);

    // Uptime
    document.getElementById('uptime').textContent = stats.uptime.formatted;
}

function updateThreatsDisplay(threats) {
    const ids = {
        sql_injection: 'sqlInjectionCount',
        xss: 'xssCount',
        path_traversal: 'pathTraversalCount',
        command_injection: 'commandInjectionCount',
        rate_limit: 'rateLimitCount',
        invalid_input: 'invalidInputCount'
    };

    for (const [key, id] of Object.entries(ids)) {
        const el = document.getElementById(id);
        const val = threats[key] || 0;
        el.textContent = val;
        // Ajouter classe 'zero' si aucune menace
        el.classList.toggle('zero', val === 0);
    }
}

function updatePerformanceDisplay(performance) {
    document.getElementById('avgResponseTime').textContent = `${performance.avgResponseTime} ms`;
    document.getElementById('totalSamples').textContent = formatNumber(performance.totalSamples);
}

function updateTrafficChart(requests) {
    const ctx = document.getElementById('trafficChart').getContext('2d');

    // Détruire l'ancien graphique s'il existe
    if (trafficChart) {
        trafficChart.destroy();
    }

    const total = requests.total || 1; // Éviter division par zéro
    const normalPercentage = ((requests.normal / total) * 100).toFixed(1);
    const suspiciousPercentage = ((requests.suspicious / total) * 100).toFixed(1);
    const blockedPercentage = ((requests.blocked / total) * 100).toFixed(1);

    trafficChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [
                `Normal (${normalPercentage}%)`,
                `Suspicious (${suspiciousPercentage}%)`,
                `Blocked (${blockedPercentage}%)`
            ],
            datasets: [{
                data: [requests.normal, requests.suspicious, requests.blocked],
                backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                borderColor: '#121829',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94A3B8',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        },
                        padding: 15,
                        usePointStyle: true,
                        pointStyleWidth: 10
                    }
                },
                tooltip: {
                    backgroundColor: '#121829',
                    titleColor: '#F1F5F9',
                    bodyColor: '#94A3B8',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    titleFont: {
                        family: "'Inter', sans-serif",
                        weight: 600
                    },
                    bodyFont: {
                        family: "'JetBrains Mono', monospace"
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function updateBannedIPsList(bannedIPs) {
    const container = document.getElementById('bannedIPsList');
    document.getElementById('bannedCount').textContent = bannedIPs.length;

    if (bannedIPs.length === 0) {
        container.innerHTML = '<div class="empty-state">No banned IPs</div>';
        return;
    }

    container.innerHTML = bannedIPs.map(ip => `
        <div class="ip-item">
            <div class="ip-header">
                <span class="ip-address">${escapeHtml(ip.ip)}</span>
                <span class="ip-score">Banned</span>
            </div>
            <div class="ip-info">Reason: ${escapeHtml(ip.reason)}</div>
            <div class="ip-info">Banned: ${formatDate(ip.bannedAt)}</div>
            <div class="ip-info">Expires: ${ip.expiresAt ? formatDate(ip.expiresAt) : 'Permanent'}</div>
            <div class="ip-info">Attempts: ${ip.attempts}</div>
            <div class="ip-actions">
                <button class="unban-btn" data-ip="${escapeHtml(ip.ip)}">Unban</button>
            </div>
        </div>
    `).join('');

    // Attacher les event listeners au lieu de onclick inline
    container.querySelectorAll('.unban-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleUnban(btn.dataset.ip);
        });
    });
}

function updateSuspiciousIPsList(suspiciousIPs) {
    const container = document.getElementById('suspiciousIPsList');
    document.getElementById('suspiciousCount').textContent = suspiciousIPs.length;

    if (suspiciousIPs.length === 0) {
        container.innerHTML = '<div class="empty-state">No suspicious IPs</div>';
        return;
    }

    container.innerHTML = suspiciousIPs.map(ip => {
        const scoreClass = ip.score >= 75 ? '' : 'medium';
        return `
            <div class="ip-item suspicious">
                <div class="ip-header">
                    <span class="ip-address">${escapeHtml(ip.ip)}</span>
                    <span class="ip-score ${scoreClass}">Score: ${ip.score}</span>
                </div>
                <div class="ip-info">Attempts: ${ip.attempts}</div>
                <div class="ip-info">Last Activity: ${formatDate(ip.lastAttempt)}</div>
                <div class="ip-info">Threats: ${ip.threats.map(t => escapeHtml(t.type)).join(', ')}</div>
            </div>
        `;
    }).join('');
}

function updateEventsList(events) {
    const container = document.getElementById('eventsList');

    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state">No recent events</div>';
        return;
    }

    container.innerHTML = events.map(event => {
        const eventClass = event.type;
        const eventType = event.type.toUpperCase();
        const time = formatTime(event.timestamp);

        let details = '';
        if (event.threatType) {
            details = `Threat: ${escapeHtml(event.threatType)}`;
        } else if (event.endpoint) {
            details = `${escapeHtml(event.method)} ${escapeHtml(event.endpoint)}`;
        }

        return `
            <div class="event-item ${eventClass}">
                <span class="event-time">${time}</span>
                <span class="event-type">${eventType}</span>
                <span class="event-ip">${escapeHtml(event.ip)}</span>
                ${details ? `<div class="event-details">${details}</div>` : ''}
            </div>
        `;
    }).join('');
}

// ====================
// EVENT HANDLERS
// ====================
async function handleUnban(ip) {
    if (!confirm(`Unban IP ${ip}?`)) return;

    try {
        await unbanIP(ip);
        console.log(`[SUCCESS] IP ${ip} unbanned`);
    } catch (error) {
        console.error(`[ERROR] Failed to unban ${ip}`, error);
        showError(`Failed to unban IP ${ip}`);
    }
}

// ====================
// HELPERS
// ====================
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showLoading() {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-content"><div class="spinner"></div><div class="loading-text">Loading data...</div></div>';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

function showError(message) {
    console.error('[ERROR]', message);
    let toast = document.getElementById('dashboardError');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'dashboardError';
        toast.className = 'error-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 5000);
}
