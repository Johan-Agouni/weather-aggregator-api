/**
 * Cache Configuration
 *
 * Simple in-memory cache using node-cache to reduce API calls
 * TTL (Time To Live) is configurable via environment variable
 */

const NodeCache = require('node-cache');

// Cache TTL from env (default: 5 minutes)
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '300');

// Initialize cache
const cache = new NodeCache({
    stdTTL: CACHE_TTL,
    checkperiod: 120, // Check for expired keys every 2 minutes
    useClones: false, // Better performance, we don't modify cached objects
});

/**
 * Generate cache key from coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} prefix - Key prefix (e.g., 'weather', 'uv', 'air')
 * @returns {string} Cache key
 */
function generateKey(lat, lon, prefix = '') {
    const roundedLat = Math.round(lat * 100) / 100; // Round to 2 decimals
    const roundedLon = Math.round(lon * 100) / 100;
    return `${prefix}:${roundedLat}:${roundedLon}`;
}

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined
 */
function get(key) {
    return cache.get(key);
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - Optional custom TTL in seconds
 */
function set(key, value, ttl = CACHE_TTL) {
    cache.set(key, value, ttl);
}

/**
 * Delete specific key from cache
 * @param {string} key - Cache key
 */
function del(key) {
    cache.del(key);
}

/**
 * Clear all cache
 */
function flush() {
    cache.flushAll();
}

/**
 * Get cache stats
 * @returns {Object} Cache statistics
 */
function getStats() {
    return cache.getStats();
}

module.exports = {
    generateKey,
    get,
    set,
    del,
    flush,
    getStats,
    CACHE_TTL,
};
