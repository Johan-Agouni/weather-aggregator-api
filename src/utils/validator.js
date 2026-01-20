/**
 * Validation Utilities
 *
 * Helpers for validating user inputs
 */

/**
 * Validate latitude and longitude coordinates
 * @param {*} lat - Latitude value
 * @param {*} lon - Longitude value
 * @returns {Object} { valid: boolean, error: string|null, coords: { lat, lon } }
 */
function validateCoordinates(lat, lon) {
    // Check if values exist
    if (lat === undefined || lat === null || lon === undefined || lon === null) {
        return {
            valid: false,
            error: 'Missing coordinates: lat and lon are required',
            coords: null,
        };
    }

    // Convert to numbers
    const numLat = parseFloat(lat);
    const numLon = parseFloat(lon);

    // Check if conversion was successful
    if (isNaN(numLat) || isNaN(numLon)) {
        return {
            valid: false,
            error: 'Invalid coordinates: lat and lon must be valid numbers',
            coords: null,
        };
    }

    // Validate latitude range (-90 to 90)
    if (numLat < -90 || numLat > 90) {
        return {
            valid: false,
            error: 'Invalid latitude: must be between -90 and 90',
            coords: null,
        };
    }

    // Validate longitude range (-180 to 180)
    if (numLon < -180 || numLon > 180) {
        return {
            valid: false,
            error: 'Invalid longitude: must be between -180 and 180',
            coords: null,
        };
    }

    // All checks passed
    return {
        valid: true,
        error: null,
        coords: {
            lat: numLat,
            lon: numLon,
        },
    };
}

/**
 * Sanitize string input
 * @param {string} input - Input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
function sanitizeString(input, maxLength = 100) {
    if (typeof input !== 'string') {
        return '';
    }

    return input.trim().slice(0, maxLength).replace(/[<>]/g, ''); // Remove basic HTML tags
}

module.exports = {
    validateCoordinates,
    sanitizeString,
};
