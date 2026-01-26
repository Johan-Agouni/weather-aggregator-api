jest.mock('../../src/security/monitoring/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    http: jest.fn(),
    security: {
        attack: jest.fn(),
        ban: jest.fn(),
        unban: jest.fn(),
        suspicious: jest.fn(),
        rateLimit: jest.fn(),
    },
}));

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn().mockRejectedValue({ code: 'ENOENT' }),
        writeFile: jest.fn().mockResolvedValue(undefined),
    },
}));

const { analytics } = require('../../src/security/monitoring/analytics');

describe('Security Analytics', () => {
    beforeEach(() => {
        // Reset metrics
        analytics.metrics.requests.total = 0;
        analytics.metrics.requests.blocked = 0;
        analytics.metrics.requests.suspicious = 0;
        analytics.metrics.requests.byEndpoint.clear();
        analytics.metrics.performance.requestTimes = [];
        analytics.metrics.performance.avgResponseTime = 0;
        analytics.timeline = [];
        Object.keys(analytics.metrics.threats).forEach(key => {
            analytics.metrics.threats[key] = 0;
        });
    });

    describe('recordRequest', () => {
        test('should increment total request count', () => {
            analytics.recordRequest({ path: '/api/weather', ip: '127.0.0.1', method: 'GET' });
            expect(analytics.metrics.requests.total).toBe(1);
        });

        test('should increment blocked count for blocked requests', () => {
            analytics.recordRequest(
                { path: '/api/weather', ip: '127.0.0.1', method: 'GET' },
                true,
                false
            );
            expect(analytics.metrics.requests.blocked).toBe(1);
        });

        test('should increment suspicious count', () => {
            analytics.recordRequest(
                { path: '/api/weather', ip: '127.0.0.1', method: 'GET' },
                false,
                true
            );
            expect(analytics.metrics.requests.suspicious).toBe(1);
        });

        test('should track requests by endpoint', () => {
            analytics.recordRequest({ path: '/api/weather', ip: '127.0.0.1', method: 'GET' });
            analytics.recordRequest({ path: '/api/weather', ip: '127.0.0.1', method: 'GET' });
            analytics.recordRequest({ path: '/api/forecast', ip: '127.0.0.1', method: 'GET' });

            expect(analytics.metrics.requests.byEndpoint.get('/api/weather')).toBe(2);
            expect(analytics.metrics.requests.byEndpoint.get('/api/forecast')).toBe(1);
        });
    });

    describe('recordThreat', () => {
        test('should increment threat counter for known type', () => {
            analytics.recordThreat('sql_injection', '1.2.3.4');
            expect(analytics.metrics.threats.sql_injection).toBe(1);
        });

        test('should add event to timeline', () => {
            analytics.recordThreat('xss', '1.2.3.4', { param: 'query.input' });
            expect(analytics.timeline).toHaveLength(1);
            expect(analytics.timeline[0].type).toBe('threat');
            expect(analytics.timeline[0].threatType).toBe('xss');
        });
    });

    describe('recordResponseTime', () => {
        test('should calculate average response time', () => {
            analytics.recordResponseTime(100);
            analytics.recordResponseTime(200);
            analytics.recordResponseTime(300);

            expect(analytics.metrics.performance.avgResponseTime).toBe(200);
        });

        test('should keep only 1000 entries', () => {
            for (let i = 0; i < 1050; i++) {
                analytics.recordResponseTime(10);
            }
            expect(analytics.metrics.performance.requestTimes.length).toBeLessThanOrEqual(1000);
        });
    });

    describe('getRecentEvents', () => {
        test('should return events in reverse chronological order', () => {
            analytics.recordRequest({ path: '/first', ip: '127.0.0.1', method: 'GET' });
            analytics.recordRequest({ path: '/second', ip: '127.0.0.1', method: 'GET' });

            const events = analytics.getRecentEvents(10);
            expect(events[0].endpoint).toBe('/second');
            expect(events[1].endpoint).toBe('/first');
        });

        test('should limit returned events', () => {
            for (let i = 0; i < 10; i++) {
                analytics.recordRequest({ path: `/path${i}`, ip: '127.0.0.1', method: 'GET' });
            }
            const events = analytics.getRecentEvents(3);
            expect(events).toHaveLength(3);
        });
    });

    describe('getStats', () => {
        test('should return well-formed statistics object', () => {
            analytics.recordRequest({ path: '/api/weather', ip: '127.0.0.1', method: 'GET' });
            analytics.recordResponseTime(50);

            const stats = analytics.getStats();

            expect(stats).toHaveProperty('uptime');
            expect(stats).toHaveProperty('requests');
            expect(stats).toHaveProperty('threats');
            expect(stats).toHaveProperty('bans');
            expect(stats).toHaveProperty('performance');
            expect(stats).toHaveProperty('topEndpoints');
            expect(stats.requests.total).toBe(1);
        });
    });

    describe('getTopEndpoints', () => {
        test('should return top endpoints sorted by count', () => {
            for (let i = 0; i < 5; i++) {
                analytics.recordRequest({ path: '/popular', ip: '127.0.0.1', method: 'GET' });
            }
            analytics.recordRequest({ path: '/rare', ip: '127.0.0.1', method: 'GET' });

            const top = analytics.getTopEndpoints(2);
            expect(top[0].endpoint).toBe('/popular');
            expect(top[0].count).toBe(5);
            expect(top).toHaveLength(2);
        });
    });
});
