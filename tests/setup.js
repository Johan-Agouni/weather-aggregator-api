/**
 * Jest Test Setup
 *
 * Configure l'environnement de test :
 * - Variables d'environnement
 * - Silence le logger Winston pendant les tests
 */

// Configurer les variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.CACHE_TTL = '5';
process.env.API_TIMEOUT = '3000';
process.env.LOG_LEVEL = 'silent';

// Désactiver les logs en console pendant les tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
