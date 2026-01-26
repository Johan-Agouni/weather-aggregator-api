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

const app = require('../../src/server');

describe('Security Routes', () => {
    describe('Without authentication configured', () => {
        beforeAll(() => {
            delete process.env.DASHBOARD_USERNAME;
            delete process.env.DASHBOARD_PASSWORD;
        });

        test('GET /api/security/stats should return 200 with stats', async () => {
            const res = await request(app)
                .get('/api/security/stats')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('requests');
            expect(res.body.data).toHaveProperty('threats');
        });

        test('GET /api/security/events should return 200 with events', async () => {
            const res = await request(app)
                .get('/api/security/events')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body.data).toHaveProperty('events');
            expect(Array.isArray(res.body.data.events)).toBe(true);
        });

        test('GET /api/security/banned-ips should return 200', async () => {
            const res = await request(app)
                .get('/api/security/banned-ips')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body.data).toHaveProperty('bannedIPs');
        });

        test('GET /api/security/suspicious-ips should return 200', async () => {
            const res = await request(app)
                .get('/api/security/suspicious-ips')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);
        });

        test('GET /api/security/export should return metrics', async () => {
            const res = await request(app)
                .get('/api/security/export')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body.data).toHaveProperty('stats');
        });
    });

    describe('With authentication configured', () => {
        beforeAll(() => {
            process.env.DASHBOARD_USERNAME = 'admin';
            process.env.DASHBOARD_PASSWORD = 'testpass123';
        });

        afterAll(() => {
            delete process.env.DASHBOARD_USERNAME;
            delete process.env.DASHBOARD_PASSWORD;
        });

        test('should return 401 without credentials', async () => {
            const res = await request(app)
                .get('/api/security/stats')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error');
        });

        test('should return 401 with wrong credentials', async () => {
            const res = await request(app)
                .get('/api/security/stats')
                .set('User-Agent', 'TestAgent')
                .set(
                    'Authorization',
                    'Basic ' + Buffer.from('wrong:credentials').toString('base64')
                );

            expect(res.status).toBe(401);
        });

        test('should return 200 with valid credentials', async () => {
            const res = await request(app)
                .get('/api/security/stats')
                .set('User-Agent', 'TestAgent')
                .set(
                    'Authorization',
                    'Basic ' + Buffer.from('admin:testpass123').toString('base64')
                );

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);
        });
    });
});
