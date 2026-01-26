const request = require('supertest');

jest.mock('axios');
const axios = require('axios');

// Mock logger to prevent file writes during tests
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

const mockWeatherResponse = {
    data: {
        current: {
            temperature_2m: 22.5,
            relative_humidity_2m: 65,
            precipitation: 0,
            weather_code: 1,
            wind_speed_10m: 12,
        },
    },
};

const mockUVResponse = {
    data: {
        now: { uvi: 5 },
    },
};

const mockAirQualityResponse = {
    data: {
        current: {
            pm10: 15,
            pm2_5: 8,
            us_aqi: 42,
        },
    },
};

const mockForecastResponse = {
    data: {
        daily: {
            time: ['2026-01-25', '2026-01-26', '2026-01-27'],
            temperature_2m_max: [20, 22, 18],
            temperature_2m_min: [10, 12, 8],
            precipitation_sum: [0, 5, 0],
            weather_code: [1, 61, 0],
            wind_speed_10m_max: [15, 25, 10],
        },
    },
};

describe('Weather API Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default: all API calls succeed
        axios.get.mockImplementation(url => {
            if (url.includes('air-quality')) return Promise.resolve(mockAirQualityResponse);
            if (url.includes('currentuvindex')) return Promise.resolve(mockUVResponse);
            return Promise.resolve(mockWeatherResponse);
        });
    });

    describe('GET /api/weather', () => {
        test('should return 200 with valid coordinates', async () => {
            const res = await request(app)
                .get('/api/weather?lat=48.8566&lon=2.3522')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('weather');
            expect(res.body).toHaveProperty('uv');
            expect(res.body).toHaveProperty('air_quality');
            expect(res.body).toHaveProperty('recommendations');
            expect(res.body).toHaveProperty('location');
            expect(res.body.location.lat).toBe(48.8566);
        });

        test('should return 400 without coordinates', async () => {
            const res = await request(app).get('/api/weather').set('User-Agent', 'TestAgent');

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Validation Error');
        });

        test('should return 400 with invalid latitude', async () => {
            const res = await request(app)
                .get('/api/weather?lat=999&lon=2.35')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(400);
        });

        test('should return 400 with invalid longitude', async () => {
            const res = await request(app)
                .get('/api/weather?lat=48.85&lon=999')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(400);
        });

        test('should return 400 with non-numeric coordinates', async () => {
            const res = await request(app)
                .get('/api/weather?lat=abc&lon=def')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/forecast', () => {
        beforeEach(() => {
            axios.get.mockResolvedValue(mockForecastResponse);
        });

        test('should return 200 with valid coordinates', async () => {
            const res = await request(app)
                .get('/api/forecast?lat=48.8566&lon=2.3522')
                .set('User-Agent', 'TestAgent');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('forecast');
            expect(res.body.forecast).toHaveProperty('days');
            expect(res.body.forecast.days.length).toBeGreaterThan(0);
        });

        test('should return 400 without coordinates', async () => {
            const res = await request(app).get('/api/forecast').set('User-Agent', 'TestAgent');

            expect(res.status).toBe(400);
        });
    });

    describe('GET /health', () => {
        test('should return 200 with health status', async () => {
            const res = await request(app).get('/health').set('User-Agent', 'TestAgent');

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('OK');
            expect(res.body).toHaveProperty('security');
        });
    });
});
