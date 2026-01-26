/**
 * WMO Weather Code Mapping
 *
 * Converts WMO weather interpretation codes to human-readable descriptions.
 * Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */

const WEATHER_CODES = {
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

/**
 * Convert weather code to human-readable description
 * @param {number} code - WMO weather code
 * @returns {string} Weather description
 */
function getWeatherDescription(code) {
    return WEATHER_CODES[code] || 'Unknown';
}

module.exports = { getWeatherDescription, WEATHER_CODES };
