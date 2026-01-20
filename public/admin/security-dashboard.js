/**
 * Security Dashboard - Frontend Logic
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
    document.getElementById('sqlInjectionCount').textContent = threats.sql_injection || 0;
    document.getElementById('xssCount').textContent = threats.xss || 0;
    document.getElementById('pathTraversalCount').textContent = threats.path_traversal || 0;
    document.getElementById('commandInjectionCount').textContent = threats.command_injection || 0;
    document.getElementById('rateLimitCount').textContent = threats.rate_limit || 0;
    document.getElementById('invalidInputCount').textContent = threats.invalid_input || 0;
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
                backgroundColor: ['#00FF41', '#FFFF00', '#FF0000'],
                borderColor: '#0F0F0F',
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
                        color: '#00FF41',
                        font: {
                            family: 'JetBrains Mono',
                            size: 12
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: '#000000',
                    titleColor: '#00FFFF',
                    bodyColor: '#00FF41',
                    borderColor: '#00FF41',
                    borderWidth: 1,
                    titleFont: {
                        family: 'JetBrains Mono'
                    },
                    bodyFont: {
                        family: 'JetBrains Mono'
                    }
                }
            }
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
                <span class="ip-address">${ip.ip}</span>
                <span class="ip-score">BANNED</span>
            </div>
            <div class="ip-info">Reason: ${ip.reason}</div>
            <div class="ip-info">Banned: ${formatDate(ip.bannedAt)}</div>
            <div class="ip-info">Expires: ${ip.expiresAt ? formatDate(ip.expiresAt) : 'Permanent'}</div>
            <div class="ip-info">Attempts: ${ip.attempts}</div>
            <div class="ip-actions">
                <button class="unban-btn" onclick="handleUnban('${ip.ip}')">[ UNBAN ]</button>
            </div>
        </div>
    `).join('');
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
                    <span class="ip-address">${ip.ip}</span>
                    <span class="ip-score ${scoreClass}">SCORE: ${ip.score}</span>
                </div>
                <div class="ip-info">Attempts: ${ip.attempts}</div>
                <div class="ip-info">Last Activity: ${formatDate(ip.lastAttempt)}</div>
                <div class="ip-info">Threats: ${ip.threats.map(t => t.type).join(', ')}</div>
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
            details = `Threat: ${event.threatType}`;
        } else if (event.endpoint) {
            details = `${event.method} ${event.endpoint}`;
        }
        
        return `
            <div class="event-item ${eventClass}">
                <span class="event-time">${time}</span>
                <span class="event-type">${eventType}</span>
                <span class="event-ip">${event.ip}</span>
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
        alert(`Failed to unban IP ${ip}`);
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

function showLoading() {
    // TODO: Implement loading indicator
    console.log('[LOADING] Loading dashboard data...');
}

function hideLoading() {
    // TODO: Hide loading indicator
    console.log('[LOADING] Data loaded');
}

function showError(message) {
    console.error('[ERROR]', message);
    // TODO: Implement error display
}

// Expose functions globally for onclick handlers
window.handleUnban = handleUnban;
