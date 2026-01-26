const request = require('supertest');

jest.mock('../../src/security/monitoring/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    http: jest.fn(),
    logHTTP: jest.fn(),
    security: {
        attack: jest.fn(),
        ban: jest.fn(),
        unban: jest.fn(),
        suspicious: jest.fn(),
        rateLimit: jest.fn(),
    },
}));

jest.mock('fs', () => {
    const actualFs = jest.requireActual('fs');
    return {
        ...actualFs,
        promises: {
            readFile: jest.fn().mockRejectedValue({ code: 'ENOENT' }),
            writeFile: jest.fn().mockResolvedValue(undefined),
        },
    };
});

jest.mock('axios', () => ({
    get: jest.fn().mockResolvedValue({
        data: {
            current: {
                temperature_2m: 20,
                relative_humidity_2m: 50,
                precipitation: 0,
                weather_code: 0,
                wind_speed_10m: 5,
            },
        },
    }),
}));

const app = require('../../src/server');

describe('Attack Detection Integration', () => {
    describe('SQL Injection', () => {
        test('should block SQL injection in query parameters', async () => {
            const res = await request(app)
                .get("/api/weather?lat=1' OR '1'='1&lon=2")
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(400);
        });

        test('should block DROP TABLE attempts', async () => {
            const res = await request(app)
                .get('/api/weather?lat=1; DROP TABLE users&lon=2')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(400);
        });
    });

    describe('XSS', () => {
        test('should block script tags', async () => {
            const res = await request(app)
                .get('/api/weather?lat=<script>alert(1)</script>&lon=2')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(400);
        });

        test('should block iframe injection', async () => {
            const res = await request(app)
                .get('/api/weather?lat=<iframe src="evil">&lon=2')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(400);
        });
    });

    describe('Path Traversal', () => {
        test('should block path traversal attempts', async () => {
            const res = await request(app)
                .get('/api/weather?lat=../../etc/passwd&lon=2')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(400);
        });
    });

    describe('Normal Requests', () => {
        test('should allow valid weather requests', async () => {
            const res = await request(app)
                .get('/api/weather?lat=48.85&lon=2.35')
                .set('User-Agent', 'TestAgent');

            // Should pass through attack detection (may be 200 or validation error)
            expect(res.status).not.toBe(403);
        });
    });

    describe('User-Agent Validation', () => {
        test('should block requests without User-Agent', async () => {
            const res = await request(app)
                .get('/api/weather?lat=48.85&lon=2.35')
                .unset('User-Agent');

            expect(res.status).toBe(400);
        });
    });
});
