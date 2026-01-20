/**
 * Air Quality Service
 *
 * Fetches air quality data from Open-Meteo Air Quality API
 * Features: Caching, timeout handling, graceful error handling
 */

const axios = require('axios');
const cache = require('../utils/cache');

class AirQualityService {
    constructor() {
        // Base URL from environment variable
        this.baseURL =
            process.env.AIR_QUALITY_URL || 'https://air-quality-api.open-meteo.com/v1/air-quality';

        // Timeout from environment variable (default: 5 seconds)
        this.timeout = parseInt(process.env.API_TIMEOUT || '5000');
    }

    /**
     * Get air quality data for coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} Air quality data
     */
    async getAirQuality(lat, lon) {
        // Check cache first
        const cacheKey = cache.generateKey(lat, lon, 'air');
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            console.log(`[CACHE HIT] Air quality for ${lat}, ${lon}`);
            return cachedData;
        }

        console.log(`[CACHE MISS] Fetching air quality for ${lat}, ${lon}`);

        try {
            const response = await axios.get(this.baseURL, {
                params: {
                    latitude: lat,
                    longitude: lon,
                    current: 'pm10,pm2_5,us_aqi',
                    timezone: 'auto',
                },
                timeout: this.timeout,
            });

            const data = response.data.current;

            const airData = {
                pm10: data.pm10,
                pm2_5: data.pm2_5,
                aqi: data.us_aqi,
                quality: this.getAirQualityLevel(data.us_aqi),
            };

            // Store in cache
            cache.set(cacheKey, airData);

            return airData;
        } catch (error) {
            console.error('[ERROR] Air Quality API:', error.message);

            // Graceful degradation - return null data instead of throwing
            return {
                pm10: null,
                pm2_5: null,
                aqi: null,
                quality: 'Unknown',
                error: 'Air quality data temporarily unavailable',
            };
        }
    }

    /**
     * Convert AQI value to quality level
     * @param {number} aqi - US AQI value
     * @returns {string} Air quality level
     */
    getAirQualityLevel(aqi) {
        if (aqi === null || aqi === undefined) return 'Unknown';
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
        if (aqi <= 200) return 'Unhealthy';
        if (aqi <= 300) return 'Very Unhealthy';
        return 'Hazardous';
    }
}

module.exports = new AirQualityService();
