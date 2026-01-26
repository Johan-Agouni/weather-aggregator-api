const { detectThreats, ATTACK_PATTERNS } = require('../../src/security/utils/threatDetection');

describe('Threat Detection', () => {
    describe('SQL Injection', () => {
        test('should detect classic SQL injection', () => {
            const result = detectThreats("1' OR '1'='1", 'query.lat');
            expect(result.isMalicious).toBe(true);
            expect(result.threats[0].type).toBe('sql_injection');
        });

        test('should detect SELECT statement', () => {
            const result = detectThreats('SELECT * FROM users', 'query.input');
            expect(result.isMalicious).toBe(true);
        });

        test('should detect UNION injection', () => {
            const result = detectThreats('1 UNION SELECT password FROM users', 'query.id');
            expect(result.isMalicious).toBe(true);
        });

        test('should detect DROP TABLE', () => {
            const result = detectThreats('DROP TABLE users', 'query.input');
            expect(result.isMalicious).toBe(true);
        });
    });

    describe('XSS', () => {
        test('should detect script tags', () => {
            const result = detectThreats('<script>alert("xss")</script>', 'query.input');
            expect(result.isMalicious).toBe(true);
            expect(result.threats[0].type).toBe('xss');
        });

        test('should detect iframe injection', () => {
            const result = detectThreats('<iframe src="evil.com">', 'query.input');
            expect(result.isMalicious).toBe(true);
        });

        test('should detect javascript: protocol', () => {
            const result = detectThreats('javascript:alert(1)', 'query.url');
            expect(result.isMalicious).toBe(true);
        });

        test('should detect event handler injection', () => {
            const result = detectThreats('onerror=alert(1)', 'query.input');
            expect(result.isMalicious).toBe(true);
        });
    });

    describe('Path Traversal', () => {
        test('should detect ../ traversal', () => {
            const result = detectThreats('../../etc/passwd', 'query.file');
            expect(result.isMalicious).toBe(true);
            expect(result.threats.some(t => t.type === 'path_traversal')).toBe(true);
        });

        test('should detect encoded traversal', () => {
            const result = detectThreats('..%2f..%2fetc%2fpasswd', 'query.file');
            expect(result.isMalicious).toBe(true);
        });

        test('should detect backslash traversal', () => {
            const result = detectThreats('..\\..\\windows\\system32', 'query.file');
            expect(result.isMalicious).toBe(true);
        });
    });

    describe('Command Injection', () => {
        test('should detect semicolon command chaining', () => {
            const result = detectThreats('value; rm -rf /', 'query.input');
            expect(result.isMalicious).toBe(true);
        });

        test('should detect pipe operator', () => {
            const result = detectThreats('value | cat /etc/passwd', 'query.input');
            expect(result.isMalicious).toBe(true);
        });

        test('should detect backtick execution', () => {
            const result = detectThreats('`whoami`', 'query.input');
            expect(result.isMalicious).toBe(true);
        });
    });

    describe('Safe Inputs (False Positives)', () => {
        test('should accept normal numeric values', () => {
            const result = detectThreats('43.5', 'query.lat');
            expect(result.isMalicious).toBe(false);
            expect(result.threats).toHaveLength(0);
        });

        test('should accept city names', () => {
            const result = detectThreats('Paris', 'query.city');
            expect(result.isMalicious).toBe(false);
        });

        test('should handle null input', () => {
            const result = detectThreats(null, 'query.lat');
            expect(result.isMalicious).toBe(false);
        });

        test('should handle undefined input', () => {
            const result = detectThreats(undefined, 'query.lat');
            expect(result.isMalicious).toBe(false);
        });

        test('should handle empty string', () => {
            const result = detectThreats('', 'query.lat');
            expect(result.isMalicious).toBe(false);
        });

        test('should handle non-string input', () => {
            const result = detectThreats(12345, 'query.lat');
            expect(result.isMalicious).toBe(false);
        });
    });

    describe('ATTACK_PATTERNS export', () => {
        test('should export attack patterns', () => {
            expect(ATTACK_PATTERNS).toBeDefined();
            expect(ATTACK_PATTERNS.sql_injection).toBeDefined();
            expect(ATTACK_PATTERNS.xss).toBeDefined();
            expect(ATTACK_PATTERNS.path_traversal).toBeDefined();
            expect(ATTACK_PATTERNS.command_injection).toBeDefined();
            expect(ATTACK_PATTERNS.ldap_injection).toBeDefined();
        });
    });
});
