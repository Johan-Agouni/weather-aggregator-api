/**
 * Weather Forecast Service
 *
 * Fetches 7-day weather forecast from Open-Meteo API
 * Features: Caching, timeout handling, daily min/max temperatures
 */

const axios = require('axios');
const cache = require('../utils/cache');
const logger = require('../security/monitoring/logger');
const { getWeatherDescription } = require('../utils/weatherCodes');

class ForecastService {
    constructor() {
        this.baseURL = process.env.OPEN_METEO_URL || 'https://api.open-meteo.com/v1/forecast';
        this.timeout = parseInt(process.env.API_TIMEOUT || '5000');
    }

    /**
     * Get 7-day weather forecast for coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} Forecast data with daily min/max temps, conditions
     */
    async getForecast(lat, lon) {
        const cacheKey = cache.generateKey(lat, lon, 'forecast');
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            logger.info(`[CACHE HIT] Forecast data for ${lat}, ${lon}`);
            return cachedData;
        }

        logger.info(`[CACHE MISS] Fetching forecast for ${lat}, ${lon}`);

        try {
            const response = await axios.get(this.baseURL, {
                params: {
                    latitude: lat,
                    longitude: lon,
                    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max',
                    timezone: 'auto',
                    forecast_days: 7,
                },
                timeout: this.timeout,
            });

            const daily = response.data.daily;

            const forecastData = {
                days: [],
            };

            for (let i = 0; i < daily.time.length; i++) {
                forecastData.days.push({
                    date: daily.time[i],
                    temp_max: daily.temperature_2m_max[i],
                    temp_min: daily.temperature_2m_min[i],
                    precipitation: daily.precipitation_sum[i],
                    wind_speed_max: daily.wind_speed_10m_max[i],
                    weather_code: daily.weather_code[i],
                    conditions: getWeatherDescription(daily.weather_code[i]),
                });
            }

            // Store in cache (longer TTL for forecast - 1 hour)
            cache.set(cacheKey, forecastData, 3600);

            return forecastData;
        } catch (error) {
            logger.error('[ERROR] Forecast API:', { message: error.message });

            if (error.code === 'ECONNABORTED') {
                throw new Error('Forecast service timeout - please try again');
            }

            if (error.response) {
                throw new Error(`Forecast service error: ${error.response.status}`);
            }

            throw new Error('Failed to fetch forecast data');
        }
    }
}

module.exports = new ForecastService();
