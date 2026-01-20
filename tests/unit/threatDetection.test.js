/**
 * EXEMPLE DE TEST UNITAIRE
 * Tests pour la détection d'attaques
 *
 * Installation : npm install --save-dev jest supertest
 * Exécution : npm test
 */

const { detectThreats } = require('../../src/security/utils/threatDetection');

describe('Attack Detection - SQL Injection', () => {
    test('devrait détecter une SQL injection classique', () => {
        const result = detectThreats("1' OR '1'='1", 'query.lat');

        expect(result.isMalicious).toBe(true);
        expect(result.threats).toHaveLength(1);
        expect(result.threats[0].type).toBe('sql_injection');
    });

    test('devrait accepter des valeurs numériques normales', () => {
        const result = detectThreats('43.5', 'query.lat');

        expect(result.isMalicious).toBe(false);
        expect(result.threats).toHaveLength(0);
    });
});

describe('Attack Detection - XSS', () => {
    test('devrait détecter <script> tag', () => {
        const result = detectThreats('<script>alert("xss")</script>', 'query.input');

        expect(result.isMalicious).toBe(true);
        expect(result.threats[0].type).toBe('xss');
    });
});
