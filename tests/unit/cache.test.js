const cache = require('../../src/utils/cache');

describe('Cache Utility', () => {
    beforeEach(() => {
        cache.flush();
    });

    describe('generateKey', () => {
        test('should generate a key with prefix and rounded coordinates', () => {
            const key = cache.generateKey(43.12345, 5.67891, 'weather');
            expect(key).toBe('weather:43.1235:5.6789');
        });

        test('should round to 4 decimal places', () => {
            const key1 = cache.generateKey(43.12341, 5.67891, 'weather');
            const key2 = cache.generateKey(43.12349, 5.67891, 'weather');
            // 43.12341 rounds to 43.1234, 43.12349 rounds to 43.1235
            expect(key1).not.toBe(key2);
        });

        test('should generate different keys for different prefixes', () => {
            const key1 = cache.generateKey(43.5, 5.4, 'weather');
            const key2 = cache.generateKey(43.5, 5.4, 'forecast');
            expect(key1).not.toBe(key2);
        });

        test('should handle negative coordinates', () => {
            const key = cache.generateKey(-33.8688, 151.2093, 'weather');
            expect(key).toBe('weather:-33.8688:151.2093');
        });
    });

    describe('get / set / del', () => {
        test('should return undefined for missing key', () => {
            expect(cache.get('nonexistent')).toBeUndefined();
        });

        test('should store and retrieve a value', () => {
            cache.set('test-key', { temp: 25 });
            expect(cache.get('test-key')).toEqual({ temp: 25 });
        });

        test('should delete a key', () => {
            cache.set('test-key', { temp: 25 });
            cache.del('test-key');
            expect(cache.get('test-key')).toBeUndefined();
        });
    });

    describe('flush', () => {
        test('should clear all cached values', () => {
            cache.set('key1', 'val1');
            cache.set('key2', 'val2');
            cache.flush();
            expect(cache.get('key1')).toBeUndefined();
            expect(cache.get('key2')).toBeUndefined();
        });
    });

    describe('getStats', () => {
        test('should return statistics object', () => {
            const stats = cache.getStats();
            expect(stats).toHaveProperty('hits');
            expect(stats).toHaveProperty('misses');
            expect(stats).toHaveProperty('keys');
        });
    });
});
