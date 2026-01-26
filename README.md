# AtmoSphere

**Interactive 3D weather dashboard with real-time security monitoring**

Globe 3D visualization, real-time weather data, UV index, air quality metrics, and enterprise-level threat detection.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![Tests](https://github.com/Johan-Agouni/weather-aggregator-api/actions/workflows/ci.yml/badge.svg)

---

## Features

### Weather Dashboard
- **3D Globe** (Globe.gl) — Click anywhere on Earth to get weather data
- **Real-time weather** — Temperature, conditions, humidity, wind, precipitation
- **UV Index** with gradient bar and risk levels
- **Air Quality** (AQI, PM2.5, PM10) with health recommendations
- **7-day forecast** with Chart.js visualization
- **City autocomplete** via Nominatim OpenStreetMap
- **Geolocation** support
- **Data export** (JSON / CSV)

### Security System
- **Helmet** — Secure HTTP headers with strict CSP
- **IP Banning** — Fail2ban-like automatic protection with scoring
- **Attack Detection** — SQL Injection, XSS, Path Traversal, Command Injection
- **Adaptive Rate Limiting** — 3-tier protection
- **Request Pattern Analysis** — Scanning behavior detection
- **Winston Logging** — Structured security logs with daily rotation
- **Real-time Dashboard** — Live threat visualization at `/admin/`

---

## Quick Start

### Prerequisites
- Node.js >= 16.0.0

### Installation

```bash
git clone https://github.com/Johan-Agouni/weather-aggregator-api.git
cd weather-aggregator-api
npm install
cp .env.example .env
npm start
```

### Development

```bash
npm run dev     # Nodemon auto-reload
npm test        # Jest with coverage
npm run lint    # ESLint
```

### Access

| Page | URL |
|------|-----|
| Weather Dashboard | http://localhost:3000 |
| Security Dashboard | http://localhost:3000/admin/ |
| Health Check | http://localhost:3000/health |

---

## Project Structure

```
atmosphere-api/
├── public/
│   ├── index.html              # Main dashboard (Globe 3D)
│   ├── style.css               # Dark Observatory theme
│   ├── script.js               # Globe.gl, autocomplete, charts
│   ├── favicon.svg
│   └── admin/                  # Security dashboard
│       ├── index.html
│       ├── security-dashboard.css
│       └── security-dashboard.js
├── src/
│   ├── server.js               # Express server
│   ├── controllers/
│   │   └── weatherController.js
│   ├── routes/
│   │   └── weather.js
│   ├── services/               # External API integrations
│   │   ├── openMeteoService.js
│   │   ├── uvIndexService.js
│   │   ├── airQualityService.js
│   │   └── forecastService.js
│   ├── utils/
│   │   ├── cache.js
│   │   ├── validator.js
│   │   └── weatherCodes.js
│   └── security/
│       ├── middleware/          # Security middlewares
│       │   ├── securityHeaders.js
│       │   ├── attackDetection.js
│       │   ├── ipBan.js
│       │   ├── rateLimiting.js
│       │   └── dashboardAuth.js
│       ├── monitoring/
│       │   ├── analytics.js
│       │   └── logger.js
│       ├── routes/
│       │   └── securityRoutes.js
│       └── utils/
│           └── threatDetection.js
├── tests/
│   ├── unit/
│   └── integration/
├── SECURITY.md
└── package.json
```

---

## API Endpoints

### Weather

```
GET /api/weather?lat={lat}&lon={lon}
GET /api/forecast?lat={lat}&lon={lon}
```

### Security

```
GET  /api/security/stats
GET  /api/security/events?limit=50
GET  /api/security/banned-ips
GET  /api/security/suspicious-ips
GET  /api/security/check/:ip
POST /api/security/ban
POST /api/security/unban/:ip
```

---

## Configuration

### Environment Variables

```bash
PORT=3000
NODE_ENV=development
CACHE_TTL=300
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BAN_THRESHOLD_SCORE=300
BAN_THRESHOLD_ATTEMPTS=20
LOG_LEVEL=info
CORS_ORIGIN=*
```

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Node.js, Express, Helmet, Winston, node-cache |
| Frontend | Vanilla JS, Globe.gl, Chart.js, CSS custom properties |
| APIs | Open-Meteo (weather + air quality), CurrentUVIndex, Nominatim OSM |
| Testing | Jest, Supertest |
| CI/CD | GitHub Actions |
| Linting | ESLint 9, Prettier |

---

## Testing

```bash
npm test                    # 84 tests, 9 suites
npm run test:watch          # Watch mode
npm run lint                # ESLint
```

---

## Security

See [SECURITY.md](SECURITY.md) for the complete security documentation, including:
- Threat detection patterns and scoring
- IP banning thresholds and configuration
- Rate limiting tiers
- Middleware pipeline architecture
- Security dashboard features

---

## License

MIT — see [LICENSE](LICENSE)

---

## Author

**Johan Agouni**

- GitHub: [@Johan-Agouni](https://github.com/Johan-Agouni)
