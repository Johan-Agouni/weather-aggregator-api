module.exports = {
    // Environnement de test
    testEnvironment: 'node',
    
    // Patterns de fichiers de tests
    testMatch: [
        '**/tests/**/*.test.js',
        '**/__tests__/**/*.js'
    ],
    
    // Coverage
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!**/node_modules/**',
        '!**/tests/**'
    ],
    
    // Seuils de coverage (ajustés pour le début du projet)
    coverageThreshold: {
        global: {
            branches: 1,
            functions: 2,
            lines: 4,
            statements: 4
        }
    },
    
    // Reporters
    coverageReporters: ['text', 'lcov', 'html'],
    
    // Timeout pour tests lents
    testTimeout: 10000,
    
    // Force exit après les tests
    forceExit: true,
    
    // Verbose output
    verbose: true
};
