const { validateCoordinates } = require('../../src/utils/validator');

describe('Validator', () => {
    test('devrait valider des coordonnées correctes', () => {
        const result = validateCoordinates(43.5, 5.4);
        expect(result.valid).toBe(true);
        expect(result.error).toBe(null);
    });

    test('devrait rejeter latitude invalide', () => {
        const result = validateCoordinates(95, 5.4);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('latitude');
    });

    test('devrait rejeter longitude invalide', () => {
        const result = validateCoordinates(43.5, 185);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('longitude');
    });
});
