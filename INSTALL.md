# 📦 INSTALLATION GUIDE

Complete installation guide for Weather Aggregator API

---

## 📋 PREREQUISITES

### Required Software

✅ **Node.js** (v16 or higher)
- Download: https://nodejs.org/
- Check version: `node --version`

✅ **npm** (comes with Node.js)
- Check version: `npm --version`

✅ **Git** (optional, for cloning)
- Download: https://git-scm.com/

### System Requirements

- **OS:** Windows, macOS, or Linux
- **RAM:** 512 MB minimum
- **Disk Space:** 200 MB

---

## 🚀 INSTALLATION METHODS

### Method 1: Git Clone (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Johan-Agouni/weather-aggregator-api.git

# 2. Navigate to project directory
cd weather-aggregator-api

# 3. Install dependencies
npm install

# 4. Configure environment
cp .env.example .env

# 5. Start the server
npm start
```

### Method 2: Download ZIP

```bash
# 1. Download ZIP from GitHub
# https://github.com/Johan-Agouni/weather-aggregator-api/archive/main.zip

# 2. Extract the ZIP file

# 3. Open terminal in extracted folder

# 4. Install dependencies
npm install

# 5. Configure environment
cp .env.example .env  # On Windows: copy .env.example .env

# 6. Start the server
npm start
```

---

## ⚙️ CONFIGURATION

### Environment Variables

Edit the `.env` file:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# API URLs (default values, don't change unless needed)
OPEN_METEO_URL=https://api.open-meteo.com/v1/forecast
AIR_QUALITY_URL=https://air-quality-api.open-meteo.com/v1/air-quality
UV_INDEX_URL=https://currentuvindex.com/api/v1/uvi
NOMINATIM_URL=https://nominatim.openstreetmap.org

# Cache Configuration (seconds)
CACHE_TTL=300  # 5 minutes

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100       # Maximum requests per window

# Request Timeout (milliseconds)
API_TIMEOUT=5000  # 5 seconds

# Logging
LOG_LEVEL=info  # debug, info, warn, error

# CORS (for production, specify your domain)
CORS_ORIGIN=*  # Allow all origins (development only)
# CORS_ORIGIN=https://yourdomain.com  # Production
```

---

## 🔧 DEPENDENCIES

The following packages will be installed:

### Production Dependencies

```json
{
  "axios": "^1.7.9",              // HTTP client
  "cors": "^2.8.5",               // CORS middleware
  "dotenv": "^16.4.7",            // Environment variables
  "express": "^4.21.2",           // Web framework
  "express-rate-limit": "^7.5.0", // Rate limiting
  "express-validator": "^7.0.1",  // Input validation
  "helmet": "^7.1.0",             // Security headers
  "node-cache": "^5.1.2",         // Caching
  "winston": "^3.11.0",           // Logging
  "winston-daily-rotate-file": "^4.7.1" // Log rotation
}
```

### Development Dependencies

```json
{
  "nodemon": "^3.1.9"  // Auto-reload on file changes
}
```

---

## 🏃 RUNNING THE APPLICATION

### Development Mode

With auto-reload on file changes:

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Custom Port

```bash
PORT=8080 npm start
```

---

## ✅ VERIFICATION

### 1. Check Server is Running

Open your browser and visit:

```
http://localhost:3000
```

You should see the Weather Aggregator interface.

### 2. Check Security Dashboard

```
http://localhost:3000/admin/security
```

You should see the security monitoring dashboard.

### 3. Check Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "uptime": 12.345,
  "timestamp": "2026-01-19T...",
  "environment": "development",
  "security": {
    "helmet": "active",
    "ipBanning": "active",
    "rateLimit": "active",
    "attackDetection": "active"
  }
}
```

### 4. Test API

```bash
# Test weather endpoint
curl "http://localhost:3000/api/weather?lat=43.5&lon=5.4"

# Test security stats
curl http://localhost:3000/api/security/stats
```

---

## 🐛 TROUBLESHOOTING

### Error: "Cannot find module"

```bash
# Solution: Reinstall dependencies
rm -rf node_modules
npm install
```

### Error: "Port 3000 already in use"

```bash
# Solution 1: Use different port
PORT=8080 npm start

# Solution 2: Kill process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:3000 | xargs kill -9
```

### Error: "ENOENT: no such file or directory"

```bash
# Solution: Create missing directories
mkdir -p logs
mkdir -p src/security/data
```

### Logs not appearing

```bash
# Solution: Check permissions
chmod -R 755 logs
```

### Dependencies installation fails

```bash
# Solution: Clear npm cache
npm cache clean --force
npm install
```

---

## 🔄 UPDATING

### Update Dependencies

```bash
# Check for outdated packages
npm outdated

# Update all packages
npm update

# Update specific package
npm update express

# Security audit
npm audit
npm audit fix
```

### Pull Latest Changes

```bash
git pull origin main
npm install  # Install new dependencies
```

---

## 🚢 DEPLOYMENT

### Production Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Configure `CORS_ORIGIN` to your domain
- [ ] Set up HTTPS (use reverse proxy)
- [ ] Configure firewall rules
- [ ] Set up process manager (PM2)
- [ ] Configure log rotation
- [ ] Set up monitoring alerts
- [ ] Backup security data

### Using PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/server.js --name weather-api

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit

# Logs
pm2 logs weather-api

# Restart
pm2 restart weather-api

# Stop
pm2 stop weather-api
```

### Using Docker (Optional)

```bash
# Build image
docker build -t weather-api .

# Run container
docker run -p 3000:3000 --env-file .env weather-api
```

---

## 📚 NEXT STEPS

After installation:

1. **Read Documentation**
   - [README.md](README.md) - Overview
   - [SECURITY.md](SECURITY.md) - Security features

2. **Explore the Dashboard**
   - Main app: http://localhost:3000
   - Security: http://localhost:3000/admin/security

3. **Test Security Features**
   - Try some attack patterns (see SECURITY.md)
   - Monitor the security dashboard
   - Check logs in `logs/` directory

4. **Customize**
   - Modify UI in `public/`
   - Adjust security thresholds
   - Add features

---

## 🆘 GETTING HELP

### Resources

- **Documentation:** See README.md and SECURITY.md
- **Issues:** https://github.com/Johan-Agouni/weather-aggregator-api/issues
- **Discussions:** GitHub Discussions

### Contact

- **Email:** johan.agouni@example.com
- **GitHub:** @Johan-Agouni

---

## 📝 LICENSE

MIT License - See [LICENSE](LICENSE) file

---

**Installation complete! 🎉**

Visit http://localhost:3000 to start using the Weather Aggregator API!
