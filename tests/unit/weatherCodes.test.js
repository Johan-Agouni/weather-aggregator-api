const { getWeatherDescription, WEATHER_CODES } = require('../../src/utils/weatherCodes');

describe('Weather Codes', () => {
    test('should return correct description for known codes', () => {
        expect(getWeatherDescription(0)).toBe('Clear sky');
        expect(getWeatherDescription(3)).toBe('Overcast');
        expect(getWeatherDescription(61)).toBe('Slight rain');
        expect(getWeatherDescription(95)).toBe('Thunderstorm');
        expect(getWeatherDescription(75)).toBe('Heavy snow');
    });

    test('should return "Unknown" for unknown code', () => {
        expect(getWeatherDescription(999)).toBe('Unknown');
        expect(getWeatherDescription(-1)).toBe('Unknown');
    });

    test('should return "Unknown" for undefined/null', () => {
        expect(getWeatherDescription(undefined)).toBe('Unknown');
        expect(getWeatherDescription(null)).toBe('Unknown');
    });

    test('should export WEATHER_CODES mapping', () => {
        expect(WEATHER_CODES).toBeDefined();
        expect(Object.keys(WEATHER_CODES).length).toBeGreaterThan(20);
    });
});
