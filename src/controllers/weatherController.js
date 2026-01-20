/**
 * Weather Controller
 *
 * Handles weather API requests and aggregates data from multiple services
 */

const openMeteoService = require('../services/openMeteoService');
const uvIndexService = require('../services/uvIndexService');
const airQualityService = require('../services/airQualityService');
const forecastService = require('../services/forecastService');
const { validateCoordinates } = require('../utils/validator');

class WeatherController {
    /**
     * Get 7-day weather forecast
     * GET /api/forecast?lat=43.5&lon=5.4
     */
    async getForecast(req, res) {
        try {
            const { lat, lon } = req.query;

            // Validate coordinates
            const validation = validateCoordinates(lat, lon);

            if (!validation.valid) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: validation.error,
                });
            }

            const { lat: validLat, lon: validLon } = validation.coords;

            console.log(`[REQUEST] 7-day forecast for coordinates: ${validLat}, ${validLon}`);

            // Fetch forecast data
            const forecast = await forecastService.getForecast(validLat, validLon);

            // Build response
            const response = {
                location: {
                    lat: validLat,
                    lon: validLon,
                },
                forecast,
                timestamp: new Date().toISOString(),
            };

            console.log(`[SUCCESS] Forecast data sent for ${validLat}, ${validLon}`);

            res.json(response);
        } catch (error) {
            console.error('[ERROR] Forecast Controller:', error.message);

            res.status(500).json({
                error: 'Internal Server Error',
                message: error.message || 'An unexpected error occurred',
            });
        }
    }

    /**
     * Get aggregated weather data
     * GET /api/weather?lat=43.5&lon=5.4
     */
    async getWeather(req, res) {
        try {
            const { lat, lon } = req.query;

            // Validate coordinates
            const validation = validateCoordinates(lat, lon);

            if (!validation.valid) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: validation.error,
                });
            }

            const { lat: validLat, lon: validLon } = validation.coords;

            console.log(`[REQUEST] Weather data for coordinates: ${validLat}, ${validLon}`);

            // Fetch data from all services in parallel
            const [weather, uvIndex, airQuality] = await Promise.all([
                openMeteoService.getWeather(validLat, validLon),
                uvIndexService.getUVIndex(validLat, validLon),
                airQualityService.getAirQuality(validLat, validLon),
            ]);

            // Generate recommendations based on all data
            const recommendations = this.generateRecommendations(weather, uvIndex, airQuality);

            // Build response
            const response = {
                location: {
                    lat: validLat,
                    lon: validLon,
                },
                weather,
                uv: uvIndex,
                air_quality: airQuality,
                recommendations,
                timestamp: new Date().toISOString(),
            };

            console.log(`[SUCCESS] Weather data sent for ${validLat}, ${validLon}`);

            res.json(response);
        } catch (error) {
            console.error('[ERROR] Weather Controller:', error.message);

            // Send appropriate error response
            res.status(500).json({
                error: 'Internal Server Error',
                message: error.message || 'An unexpected error occurred',
            });
        }
    }

    /**
     * Generate smart recommendations based on all weather data
     * @param {Object} weather - Weather data
     * @param {Object} uv - UV index data
     * @param {Object} airQuality - Air quality data
     * @returns {Array<string>} Recommendations
     */
    generateRecommendations(weather, uv, airQuality) {
        const recommendations = [];

        // UV-based recommendations
        if (uv.uv_index !== null) {
            if (uv.uv_index >= 8) {
                recommendations.push(
                    "[!] Index UV très élevé : Évitez l'exposition au soleil entre 10h et 16h"
                );
            } else if (uv.uv_index >= 6) {
                recommendations.push('[!] Index UV élevé : Appliquez de la crème solaire SPF 30+');
            } else if (uv.uv_index >= 3) {
                recommendations.push('[i] Index UV modéré : Protection solaire recommandée');
            }
        }

        // Precipitation recommendations
        if (weather.precipitation > 5) {
            recommendations.push(
                '[!] Fortes pluies prévues : Prenez un parapluie et conduisez prudemment'
            );
        } else if (weather.precipitation > 0) {
            recommendations.push('[i] Pluie prévue : Prenez un parapluie');
        }

        // Temperature recommendations
        if (weather.temperature < 0) {
            recommendations.push('[!] Gel : Habillez-vous très chaudement et attention au verglas');
        } else if (weather.temperature < 5) {
            recommendations.push('[i] Température très froide : Habillez-vous chaudement');
        } else if (weather.temperature < 15) {
            recommendations.push('[i] Température fraîche : Prévoyez une veste');
        } else if (weather.temperature > 30) {
            recommendations.push(
                "[!] Forte chaleur : Restez hydraté et évitez l'effort physique intense"
            );
        }

        // Wind recommendations
        if (weather.wind_speed > 50) {
            recommendations.push("[!] Vent très violent : Restez à l'intérieur si possible");
        } else if (weather.wind_speed > 30) {
            recommendations.push("[!] Vent très fort : Soyez prudent à l'extérieur");
        } else if (weather.wind_speed > 20) {
            recommendations.push('[i] Conditions venteuses : Attention aux objets légers');
        }

        // Air quality recommendations
        if (airQuality.aqi !== null) {
            if (airQuality.aqi > 200) {
                recommendations.push(
                    "[!] Qualité de l'air dangereuse : Restez à l'intérieur, portez un masque FFP2"
                );
            } else if (airQuality.aqi > 150) {
                recommendations.push(
                    "[!] Qualité de l'air médiocre : Portez un masque et limitez les activités extérieures"
                );
            } else if (airQuality.aqi > 100) {
                recommendations.push(
                    "[i] Qualité de l'air modérée : Les personnes sensibles devraient limiter leur exposition"
                );
            }
        }

        // Ideal conditions
        if (
            weather.temperature >= 18 &&
            weather.temperature <= 25 &&
            (!uv.uv_index || uv.uv_index < 6) &&
            (!airQuality.aqi || airQuality.aqi < 100) &&
            weather.precipitation === 0 &&
            weather.wind_speed < 20
        ) {
            recommendations.push('[+] Conditions météo idéales pour les activités extérieures');
        }

        // Default message if no specific recommendations
        if (recommendations.length === 0) {
            recommendations.push('[+] Conditions météorologiques acceptables');
        }

        return recommendations;
    }
}

module.exports = new WeatherController();
