/**
 * Open Meteo Weather Service
 *
 * Fetches current weather data from Open-Meteo API
 * Features: Caching, timeout handling, environment configuration
 */

const axios = require('axios');
const cache = require('../utils/cache');

class OpenMeteoService {
    constructor() {
        // Base URL from environment variable
        this.baseURL = process.env.OPEN_METEO_URL || 'https://api.open-meteo.com/v1/forecast';

        // Timeout from environment variable (default: 5 seconds)
        this.timeout = parseInt(process.env.API_TIMEOUT || '5000');
    }

    /**
     * Get current weather data for coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} Weather data
     */
    async getWeather(lat, lon) {
        // Check cache first
        const cacheKey = cache.generateKey(lat, lon, 'weather');
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            console.log(`[CACHE HIT] Weather data for ${lat}, ${lon}`);
            return cachedData;
        }

        console.log(`[CACHE MISS] Fetching weather data for ${lat}, ${lon}`);

        try {
            const response = await axios.get(this.baseURL, {
                params: {
                    latitude: lat,
                    longitude: lon,
                    current:
                        'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
                    timezone: 'auto',
                },
                timeout: this.timeout, // Request timeout
            });

            const data = response.data.current;

            const weatherData = {
                temperature: data.temperature_2m,
                humidity: data.relative_humidity_2m,
                precipitation: data.precipitation,
                weather_code: data.weather_code,
                wind_speed: data.wind_speed_10m,
                conditions: this.getWeatherDescription(data.weather_code),
            };

            // Store in cache
            cache.set(cacheKey, weatherData);

            return weatherData;
        } catch (error) {
            console.error('[ERROR] Open Meteo API:', error.message);

            // Better error messages
            if (error.code === 'ECONNABORTED') {
                throw new Error('Weather service timeout - please try again');
            }

            if (error.response) {
                throw new Error(`Weather service error: ${error.response.status}`);
            }

            throw new Error('Failed to fetch weather data');
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

module.exports = new OpenMeteoService();
