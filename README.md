# 🌤️ Weather Aggregator API

**Terminal-style weather aggregator with enterprise-level security** 

Real-time weather data, UV index, and air quality metrics from multiple APIs with comprehensive security features.

![License](https://img.shields.io/badge/license-MIT-blue)
![Security](https://img.shields.io/badge/security-enterprise-brightgreen)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![Tests](https://github.com/Johan-Agouni/weather-aggregator-api/actions/workflows/ci.yml/badge.svg)

---

## 🎯 FEATURES

### Weather Data
- ☀️ **Real-time weather** (temperature, conditions, humidity, wind)
- 🌡️ **UV Index** with risk levels
- 💨 **Air Quality Index** (AQI, PM2.5, PM10)
- 📊 **7-day forecast** with interactive charts
- 📍 **Geolocation support**
- 🔍 **City autocomplete** (Nominatim OSM)

### Security Features 🛡️
- ✅ **Helmet** - Secure HTTP headers
- ✅ **IP Banning System** - Fail2ban-like automatic protection
- ✅ **Attack Detection** - SQL Injection, XSS, Path Traversal, etc.
- ✅ **Adaptive Rate Limiting** - 3-tier protection
- ✅ **Request Pattern Analysis** - Detect scanning behavior
- ✅ **Winston Logging** - Structured security logs
- ✅ **Real-time Monitoring Dashboard** - Live threat visualization

---

## 🖥️ SCREENSHOTS

### Main App
![Weather App](docs/screenshots/main-app.png)

### Security Dashboard
![Security Dashboard](docs/screenshots/security-dashboard.png)

---

## 🚀 QUICK START

### Prerequisites
- Node.js >= 16.0.0
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Johan-Agouni/weather-aggregator-api.git
cd weather-aggregator-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start the server
npm start
```

### Development Mode

```bash
npm run dev  # Uses nodemon for auto-reload
```

### Access

- **Main App:** http://localhost:3000
- **Security Dashboard:** http://localhost:3000/admin/security
- **Health Check:** http://localhost:3000/health

---

## 📁 PROJECT STRUCTURE

```
weather-aggregator-api/
├── public/                  # Frontend
│   ├── index.html          # Main weather app
│   ├── style.css           # Terminal-style UI
│   ├── script.js           # App logic
│   └── admin/              # Security dashboard
│       ├── index.html
│       ├── security-dashboard.css
│       └── security-dashboard.js
├── src/
│   ├── server.js           # Express server with security
│   ├── controllers/        # Business logic
│   ├── routes/             # API routes
│   ├── services/           # External API calls
│   ├── utils/              # Utilities
│   └── security/           # Security system
│       ├── middleware/     # Security middlewares
│       ├── monitoring/     # Logging & analytics
│       ├── utils/          # Threat detection
│       ├── routes/         # Security API
│       └── data/           # Banned IPs storage
├── logs/                   # Security & error logs
├── SECURITY.md             # Security documentation
└── package.json
```

---

## 🔐 SECURITY

This project implements **enterprise-level security** features:

### Protection Layers

1. **HTTP Security Headers** (Helmet)
2. **IP Banning** (automatic & manual)
3. **Attack Detection** (SQL, XSS, Path Traversal, etc.)
4. **Rate Limiting** (adaptive, 3 levels)
5. **Pattern Analysis** (detect scanning)
6. **Logging** (Winston with rotation)

### Security Dashboard

Access real-time security monitoring:
```
http://localhost:3000/admin/security
```

**Features:**
- Live traffic statistics
- Threat detection metrics
- Banned IPs management
- Suspicious IPs monitoring
- Security events timeline
- Performance metrics

See [SECURITY.md](SECURITY.md) for complete documentation.

---

## 📡 API ENDPOINTS

### Weather API

```bash
GET /api/weather?lat={latitude}&lon={longitude}
```

**Response:**
```json
{
  "location": { "lat": 43.5, "lon": 5.4 },
  "weather": {
    "temperature": 18,
    "conditions": "Clear sky",
    "humidity": 65,
    "wind_speed": 12,
    "precipitation": 0
  },
  "uv": {
    "uv_index": 5,
    "risk_level": "Moderate"
  },
  "air_quality": {
    "aqi": 42,
    "quality": "Good",
    "pm2_5": 8.5,
    "pm10": 15.2
  },
  "recommendations": [...]
}
```

### Forecast API

```bash
GET /api/forecast?lat={latitude}&lon={longitude}
```

### Security API

```bash
GET /api/security/stats              # Statistics
GET /api/security/events             # Recent events
GET /api/security/banned-ips         # Banned IPs list
GET /api/security/suspicious-ips     # Suspicious IPs
POST /api/security/unban/:ip         # Unban IP
POST /api/security/ban               # Ban IP manually
GET /api/security/check/:ip          # Check IP status
```

---

## ⚙️ CONFIGURATION

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# Cache
CACHE_TTL=300  # 5 minutes

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      # Max requests

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGIN=*  # Configure for production!
```

### Security Configuration

Adjust thresholds in:
- `src/security/middleware/ipBan.js` - Ban thresholds
- `src/security/utils/threatDetection.js` - Threat scores
- `src/security/middleware/rateLimiting.js` - Rate limits

---

## 🧪 TESTING

### Test Attack Detection

```bash
# SQL Injection attempt
curl "http://localhost:3000/api/weather?lat=1' OR '1'='1&lon=5"

# XSS attempt
curl "http://localhost:3000/api/weather?lat=<script>alert('xss')</script>&lon=5"

# Check if IP gets flagged
curl http://localhost:3000/api/security/check/YOUR_IP
```

### Monitor Security

```bash
# Watch logs
tail -f logs/security-*.log

# Check dashboard
open http://localhost:3000/admin/security
```

---

## 📊 TECH STACK

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Axios** - HTTP client
- **Helmet** - Security headers
- **Winston** - Logging
- **node-cache** - Caching

### Frontend
- **Vanilla JavaScript** - No frameworks
- **Chart.js** - Data visualization
- **CSS3** - Terminal-style UI
- **JetBrains Mono** - Font

### APIs Used
- Open-Meteo (Weather & Air Quality)
- CurrentUVIndex (UV data)
- Nominatim OSM (Geocoding)

---

## 🤝 CONTRIBUTING

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 LICENSE

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 AUTHOR

**Johan Agouni**

- GitHub: [@Johan-Agouni](https://github.com/Johan-Agouni)
- Portfolio: [Coming Soon]

---

## 🙏 ACKNOWLEDGMENTS

- Open-Meteo for weather data API
- OpenStreetMap Nominatim for geocoding
- All open-source contributors

---

## 📈 ROADMAP

- [ ] User authentication & API keys
- [ ] Database integration (MongoDB)
- [ ] Email alerts for weather conditions
- [ ] Mobile app (React Native)
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] CI/CD pipeline
- [ ] Unit & integration tests

---

## 🐛 KNOWN ISSUES

None at the moment. Report issues on GitHub!

---

## 📞 SUPPORT

For support, email johan.agouni@example.com or open an issue on GitHub.

---

**Made with ❤️ for learning and portfolio showcase**
