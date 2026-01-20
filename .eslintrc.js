module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true
    },
    extends: [
        'eslint:recommended',
        'prettier'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        // Warnings (pas bloquant)
        'no-console': 'off', // console.log autorisé
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        
        // Errors (bloquant)
        'no-undef': 'error',
        'no-redeclare': 'error'
    }
};
