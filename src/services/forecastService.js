/**
 * Weather Forecast Service
 *
 * Fetches 7-day weather forecast from Open-Meteo API
 * Features: Caching, timeout handling, daily min/max temperatures
 */

const axios = require('axios');
const cache = require('../utils/cache');

class ForecastService {
    constructor() {
        // Base URL from environment variable
        this.baseURL = process.env.OPEN_METEO_URL || 'https://api.open-meteo.com/v1/forecast';

        // Timeout from environment variable
        this.timeout = parseInt(process.env.API_TIMEOUT || '5000');
    }

    /**
     * Get 7-day weather forecast for coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} Forecast data with daily min/max temps, conditions
     */
    async getForecast(lat, lon) {
        // Check cache first
        const cacheKey = cache.generateKey(lat, lon, 'forecast');
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            console.log(`[CACHE HIT] Forecast data for ${lat}, ${lon}`);
            return cachedData;
        }

        console.log(`[CACHE MISS] Fetching forecast for ${lat}, ${lon}`);

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

            // Transform data into structured forecast
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
                    conditions: this.getWeatherDescription(daily.weather_code[i]),
                });
            }

            // Store in cache (longer TTL for forecast - 1 hour)
            cache.set(cacheKey, forecastData, 3600);

            return forecastData;
        } catch (error) {
            console.error('[ERROR] Forecast API:', error.message);

            if (error.code === 'ECONNABORTED') {
                throw new Error('Forecast service timeout - please try again');
            }

            if (error.response) {
                throw new Error(`Forecast service error: ${error.response.status}`);
            }

            throw new Error('Failed to fetch forecast data');
        }
    }

    /**
     * Convert weather code to human-readable description
     * @param {number} code - WMO weather code
     * @returns {string} Weather description
     */
    getWeatherDescription(code) {
        const weatherCodes = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            66: 'Light freezing rain',
            67: 'Heavy freezing rain',
            71: 'Slight snow',
            73: 'Moderate snow',
            75: 'Heavy snow',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail',
        };

        return weatherCodes[code] || 'Unknown';
    }
}

module.exports = new ForecastService();
