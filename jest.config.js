module.exports = {
    testEnvironment: 'node',

    testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.js'],

    collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!**/node_modules/**', '!**/tests/**'],

    coverageThreshold: {
        global: {
            branches: 40,
            functions: 50,
            lines: 50,
            statements: 50,
        },
    },

    coverageReporters: ['text', 'lcov', 'html'],

    testTimeout: 10000,

    forceExit: true,

    verbose: true,

    setupFiles: ['./tests/setup.js'],
};
