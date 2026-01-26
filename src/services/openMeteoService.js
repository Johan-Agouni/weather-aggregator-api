/**
 * Open Meteo Weather Service
 *
 * Fetches current weather data from Open-Meteo API
 * Features: Caching, timeout handling, environment configuration
 */

const axios = require('axios');
const cache = require('../utils/cache');
const logger = require('../security/monitoring/logger');
const { getWeatherDescription } = require('../utils/weatherCodes');

class OpenMeteoService {
    constructor() {
        this.baseURL = process.env.OPEN_METEO_URL || 'https://api.open-meteo.com/v1/forecast';
        this.timeout = parseInt(process.env.API_TIMEOUT || '5000');
    }

    /**
     * Get current weather data for coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} Weather data
     */
    async getWeather(lat, lon) {
        const cacheKey = cache.generateKey(lat, lon, 'weather');
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            logger.info(`[CACHE HIT] Weather data for ${lat}, ${lon}`);
            return cachedData;
        }

        logger.info(`[CACHE MISS] Fetching weather data for ${lat}, ${lon}`);

        try {
            const response = await axios.get(this.baseURL, {
                params: {
                    latitude: lat,
                    longitude: lon,
                    current:
                        'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
                    timezone: 'auto',
                },
                timeout: this.timeout,
            });

            const data = response.data.current;

            const weatherData = {
                temperature: data.temperature_2m,
                humidity: data.relative_humidity_2m,
                precipitation: data.precipitation,
                weather_code: data.weather_code,
                wind_speed: data.wind_speed_10m,
                conditions: getWeatherDescription(data.weather_code),
            };

            cache.set(cacheKey, weatherData);

            return weatherData;
        } catch (error) {
            logger.error('[ERROR] Open Meteo API:', { message: error.message });

            if (error.code === 'ECONNABORTED') {
                throw new Error('Weather service timeout - please try again');
            }

            if (error.response) {
                throw new Error(`Weather service error: ${error.response.status}`);
            }

            throw new Error('Failed to fetch weather data');
        }
    }
}

module.exports = new OpenMeteoService();
