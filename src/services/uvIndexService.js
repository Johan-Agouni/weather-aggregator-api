/**
 * UV Index Service
 *
 * Fetches UV index data from CurrentUVIndex API
 * Features: Caching, timeout handling, graceful error handling
 */

const axios = require('axios');
const cache = require('../utils/cache');
const logger = require('../security/monitoring/logger');

class UVIndexService {
    constructor() {
        this.baseURL = process.env.UV_INDEX_URL || 'https://currentuvindex.com/api/v1/uvi';
        this.timeout = parseInt(process.env.API_TIMEOUT || '5000');
    }

    /**
     * Get UV index data for coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} UV index data
     */
    async getUVIndex(lat, lon) {
        const cacheKey = cache.generateKey(lat, lon, 'uv');
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            logger.info(`[CACHE HIT] UV index for ${lat}, ${lon}`);
            return cachedData;
        }

        logger.info(`[CACHE MISS] Fetching UV index for ${lat}, ${lon}`);

        try {
            const response = await axios.get(this.baseURL, {
                params: {
                    latitude: lat,
                    longitude: lon,
                },
                timeout: this.timeout,
            });

            const uv = response.data.now.uvi;

            const uvData = {
                uv_index: uv,
                risk_level: this.getUVRiskLevel(uv),
            };

            cache.set(cacheKey, uvData);

            return uvData;
        } catch (error) {
            logger.error('[ERROR] UV Index API:', { message: error.message });

            // Graceful degradation - return null data instead of throwing
            return {
                uv_index: null,
                risk_level: 'Unknown',
                error: 'UV data temporarily unavailable',
            };
        }
    }

    /**
     * Convert UV index value to risk level
     * @param {number} uv - UV index value
     * @returns {string} Risk level
     */
    getUVRiskLevel(uv) {
        if (uv <= 2) return 'Low';
        if (uv <= 5) return 'Moderate';
        if (uv <= 7) return 'High';
        if (uv <= 10) return 'Very High';
        return 'Extreme';
    }
}

module.exports = new UVIndexService();
