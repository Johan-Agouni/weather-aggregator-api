jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn().mockRejectedValue({ code: 'ENOENT' }),
        writeFile: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../../src/security/monitoring/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    security: {
        attack: jest.fn(),
        ban: jest.fn(),
        unban: jest.fn(),
        suspicious: jest.fn(),
        rateLimit: jest.fn(),
    },
}));

const ipBanManager = require('../../src/security/middleware/ipBan');

describe('IP Ban Manager', () => {
    beforeEach(async () => {
        // Reset internal state
        ipBanManager.bannedIPs.clear();
        ipBanManager.suspiciousIPs.clear();
    });

    describe('banIP / isBanned / unbanIP', () => {
        test('should ban an IP and detect it as banned', async () => {
            await ipBanManager.banIP('1.2.3.4', 'test ban', 60);
            expect(ipBanManager.isBanned('1.2.3.4')).toBe(true);
        });

        test('should unban a previously banned IP', async () => {
            await ipBanManager.banIP('1.2.3.4', 'test ban', 60);
            const result = await ipBanManager.unbanIP('1.2.3.4');
            expect(result).toBe(true);
            expect(ipBanManager.isBanned('1.2.3.4')).toBe(false);
        });

        test('should return false when unbanning a non-banned IP', async () => {
            const result = await ipBanManager.unbanIP('9.9.9.9');
            expect(result).toBe(false);
        });

        test('should not report non-banned IP as banned', () => {
            expect(ipBanManager.isBanned('5.5.5.5')).toBe(false);
        });
    });

    describe('getBanInfo', () => {
        test('should return ban info for a banned IP', async () => {
            await ipBanManager.banIP('1.2.3.4', 'sql_injection', 60);
            const info = ipBanManager.getBanInfo('1.2.3.4');
            expect(info).not.toBeNull();
            expect(info.reason).toBe('sql_injection');
            expect(info.bannedAt).toBeDefined();
            expect(info.expiresAt).toBeDefined();
        });

        test('should return null for non-banned IP', () => {
            expect(ipBanManager.getBanInfo('5.5.5.5')).toBeNull();
        });
    });

    describe('recordSuspiciousActivity', () => {
        test('should track suspicious activity without banning under threshold', () => {
            const shouldBan = ipBanManager.recordSuspiciousActivity('10.0.0.1', 'invalid_input');
            expect(shouldBan).toBe(false);

            const suspicious = ipBanManager.suspiciousIPs.get('10.0.0.1');
            expect(suspicious.attempts).toBe(1);
            expect(suspicious.score).toBe(5);
        });

        test('should auto-ban when score exceeds threshold', () => {
            // sql_injection = 50 points. 6 attempts = 300 = threshold
            for (let i = 0; i < 5; i++) {
                ipBanManager.recordSuspiciousActivity('10.0.0.2', 'sql_injection');
            }
            const shouldBan = ipBanManager.recordSuspiciousActivity('10.0.0.2', 'sql_injection');
            expect(shouldBan).toBe(true);
            expect(ipBanManager.isBanned('10.0.0.2')).toBe(true);
        });

        test('should auto-ban when attempt count exceeds threshold', () => {
            for (let i = 0; i < 19; i++) {
                ipBanManager.recordSuspiciousActivity('10.0.0.3', 'invalid_input');
            }
            const shouldBan = ipBanManager.recordSuspiciousActivity('10.0.0.3', 'invalid_input');
            expect(shouldBan).toBe(true);
        });
    });

    describe('getAllBanned / getAllSuspicious', () => {
        test('should return all banned IPs', async () => {
            await ipBanManager.banIP('1.1.1.1', 'test1', 60);
            await ipBanManager.banIP('2.2.2.2', 'test2', 60);

            const banned = ipBanManager.getAllBanned();
            expect(banned).toHaveLength(2);
            expect(banned[0].ip).toBe('1.1.1.1');
        });

        test('should return all suspicious IPs', () => {
            ipBanManager.recordSuspiciousActivity('3.3.3.3', 'xss');
            ipBanManager.recordSuspiciousActivity('4.4.4.4', 'sql_injection');

            const suspicious = ipBanManager.getAllSuspicious();
            expect(suspicious).toHaveLength(2);
        });
    });

    describe('getStats', () => {
        test('should return correct statistics', async () => {
            await ipBanManager.banIP('1.1.1.1', 'test', 60);
            ipBanManager.recordSuspiciousActivity('2.2.2.2', 'xss');

            const stats = ipBanManager.getStats();
            expect(stats.bannedCount).toBe(1);
            expect(stats.suspiciousCount).toBe(1);
        });
    });
});
