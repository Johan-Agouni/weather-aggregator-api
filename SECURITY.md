# 🛡️ SECURITY DOCUMENTATION

## Weather Aggregator API - Security Features

This document describes the comprehensive security architecture implemented in the Weather Aggregator API.

---

## 📑 TABLE OF CONTENTS

1. [Security Overview](#security-overview)
2. [Security Features](#security-features)
3. [Architecture](#architecture)
4. [Threat Detection](#threat-detection)
5. [IP Banning System](#ip-banning-system)
6. [Rate Limiting](#rate-limiting)
7. [Monitoring & Logging](#monitoring--logging)
8. [Security Dashboard](#security-dashboard)
9. [Configuration](#configuration)
10. [Best Practices](#best-practices)

---

## 🎯 SECURITY OVERVIEW

The Weather Aggregator API implements **enterprise-level security** with multiple layers of protection:

- **HTTP Security Headers** (Helmet)
- **Attack Detection** (SQL Injection, XSS, Path Traversal, etc.)
- **IP Banning System** (Fail2ban-like)
- **Adaptive Rate Limiting**
- **Request Pattern Analysis**
- **Comprehensive Logging** (Winston)
- **Real-time Security Monitoring**

---

## 🔐 SECURITY FEATURES

### 1. Security Headers (Helmet)

Helmet configures secure HTTP headers:

```javascript
✅ Content-Security-Policy (CSP)
✅ X-Frame-Options (Clickjacking protection)
✅ X-Content-Type-Options (MIME sniffing protection)
✅ Strict-Transport-Security (HSTS)
✅ X-XSS-Protection
✅ Referrer-Policy
```

**Location:** `src/security/middleware/securityHeaders.js`

### 2. Attack Detection

Detects and blocks common web attacks:

```javascript
✅ SQL Injection
✅ Cross-Site Scripting (XSS)
✅ Path Traversal
✅ Command Injection
✅ LDAP Injection
✅ Suspicious User-Agents
```

**Location:** `src/security/utils/threatDetection.js`

### 3. IP Banning System

Automatic IP banning based on malicious activity:

```javascript
✅ Automatic ban after threshold
✅ Temporary & permanent bans
✅ Threat scoring system
✅ Persistent storage (JSON file)
✅ Auto-cleanup of expired bans
```

**Location:** `src/security/middleware/ipBan.js`

### 4. Rate Limiting

Adaptive rate limiting with 3 levels:

- **Moderate** (100 req/15min) - Normal users
- **Strict** (20 req/hour) - Suspicious IPs  
- **Pattern Analysis** - Detects scanning behavior

**Location:** `src/security/middleware/rateLimiting.js`

### 5. Logging & Monitoring

Structured logging with Winston:

```javascript
✅ Daily rotating log files
✅ Security event tracking
✅ HTTP request logging
✅ Error tracking
✅ 14-day retention (security logs)
✅ 30-day retention (error logs)
```

**Location:** `src/security/monitoring/logger.js`

### 6. Analytics & Metrics

Real-time security analytics:

```javascript
✅ Request statistics
✅ Threat detection metrics
✅ Performance tracking
✅ Top endpoints analysis
✅ Event timeline
```

**Location:** `src/security/monitoring/analytics.js`

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────────┐
│              HTTP REQUEST                    │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Trust Proxy (1)    │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Helmet Headers (2) │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │    CORS (3)         │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Body Parsing (4)   │
        │  (Limited to 10KB)  │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Request Log (5)    │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  IP Ban Check (6)   │ ◄── Fails if IP banned
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │ Pattern Analysis(7) │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │ User-Agent Check(8) │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │ Attack Detection(9) │ ◄── SQL, XSS, etc.
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Rate Limiting (10) │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │   APPLICATION       │
        │    ROUTES           │
        └─────────────────────┘
```

**Order matters!** Each layer adds protection.

---

## 🚨 THREAT DETECTION

### Detection Patterns

#### SQL Injection
```regex
/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/gi
/(--|;|\/\*|\*\/)/gi
/('|(\\')|(--)|(%27))/gi
```

#### XSS (Cross-Site Scripting)
```regex
/<script[^>]*>.*?<\/script>/gi
/<iframe[^>]*>/gi
/javascript:/gi
/on\w+\s*=/gi
```

#### Path Traversal
```regex
/\.\.(\/|\\)/g
/(\.\.%2f|\.\.%5c)/gi
```

### Threat Scoring

Each threat type has a score:

| Threat Type       | Score |
|-------------------|-------|
| SQL Injection     | 50    |
| Path Traversal    | 45    |
| XSS               | 40    |
| Rate Limit        | 10    |
| Invalid Input     | 5     |

**Auto-ban threshold:** 100 points or 10 attempts

---

## 🚫 IP BANNING SYSTEM

### Automatic Banning

An IP is automatically banned when:

1. **Threat score ≥ 100** (accumulated malicious attempts)
2. **≥ 10 suspicious attempts** in short period
3. **Multiple rate limit violations**

### Ban Duration

- **Automatic bans:** 60 minutes
- **Strict violations:** 120 minutes (2 hours)
- **Manual bans:** Configurable (0 = permanent)

### Storage

Banned IPs are persisted in:
```
src/security/data/banned-ips.json
```

### Manual Management

Via Security Dashboard or API:

```bash
# Check IP status
GET /api/security/check/:ip

# Ban IP
POST /api/security/ban
{
  "ip": "192.168.1.100",
  "reason": "Manual ban",
  "duration": 0  # 0 = permanent
}

# Unban IP
POST /api/security/unban/:ip
```

---

## ⏱️ RATE LIMITING

### Moderate Limiter (API endpoints)

```javascript
Window: 15 minutes
Max: 100 requests
Applies to: /api/weather, /api/forecast
```

### Strict Limiter (Security endpoints)

```javascript
Window: 1 hour
Max: 20 requests
Applies to: /api/security/*
```

### Pattern Analysis

Detects:
- **High request rate** (>30 req/min)
- **Scanning behavior** (>10 unique paths + >20 req/min)

---

## 📊 MONITORING & LOGGING

### Log Files

Located in `logs/` directory:

```
logs/
├── security-2024-01-19.log  # Daily rotation
├── error-2024-01-19.log     # Errors only
└── ...
```

### Log Levels

- `error` - Errors and exceptions
- `warn` - Security warnings, attacks
- `info` - General information
- `http` - HTTP requests
- `debug` - Debug information

### Security Events Logged

- Attack attempts
- IP bans/unbans
- Rate limit violations
- Suspicious activity
- Pattern anomalies

---

## 🖥️ SECURITY DASHBOARD

Access the real-time security dashboard:

```
http://localhost:3000/admin/security
```

### Features

✅ **Real-time Statistics**
- Total requests, blocked, suspicious
- Uptime, requests/second

✅ **Traffic Distribution**
- Visual chart (Normal/Suspicious/Blocked)

✅ **Threat Detection Metrics**
- SQL Injection, XSS, Path Traversal counts

✅ **Banned IPs List**
- View all banned IPs
- Unban functionality

✅ **Suspicious IPs**
- IPs under monitoring
- Threat scores

✅ **Recent Events Timeline**
- Last 50 security events

✅ **Performance Metrics**
- Average response time

**Auto-refresh:** Every 5 seconds

---

## ⚙️ CONFIGURATION

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=*  # Configure for production!
```

### Customization

**Adjust ban thresholds:**
```javascript
// src/security/middleware/ipBan.js
const BAN_THRESHOLD_SCORE = 100;
const BAN_THRESHOLD_ATTEMPTS = 10;
```

**Modify threat scores:**
```javascript
// src/security/utils/threatDetection.js
const threatScores = {
    'sql_injection': 50,
    'xss': 40,
    // ...
};
```

---

## 🔒 BEST PRACTICES

### For Production

1. **Configure CORS properly**
   ```javascript
   CORS_ORIGIN=https://yourdomain.com
   ```

2. **Enable HTTPS**
   - Use reverse proxy (nginx, Apache)
   - Configure SSL certificates

3. **Set strong CSP**
   - Review Content-Security-Policy
   - Adjust for your needs

4. **Monitor logs**
   - Setup log aggregation
   - Alert on critical events

5. **Regular backups**
   - Backup `banned-ips.json`
   - Save security logs

6. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

### For Development

1. **Test security features**
   ```bash
   # Try malicious inputs
   curl "http://localhost:3000/api/weather?lat=1' OR '1'='1"
   ```

2. **Monitor dashboard**
   - Watch for false positives
   - Adjust thresholds if needed

3. **Review logs**
   ```bash
   tail -f logs/security-*.log
   ```

---

## 🎓 SECURITY CHECKLIST

- [x] HTTPS enabled
- [x] Security headers configured (Helmet)
- [x] CORS configured
- [x] Rate limiting active
- [x] Input validation
- [x] Attack detection
- [x] IP banning system
- [x] Logging enabled
- [x] Monitoring dashboard
- [x] Error handling
- [x] Regular updates

---

## 📞 SUPPORT

**Found a security vulnerability?**

Please report responsibly:
- 📧 Email: security@yourdomain.com
- 🔐 Use GitHub Security Advisories

**For questions:**
- GitHub Issues
- Documentation: See README.md

---

## 📝 LICENSE

MIT License - See LICENSE file

---

**Last Updated:** January 2026  
**Version:** 1.0.0  
**Author:** Johan Agouni
