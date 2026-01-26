# AtmoSphere

**Dashboard m\u00e9t\u00e9o interactif avec globe 3D et monitoring de s\u00e9curit\u00e9 en temps r\u00e9el**

Visualisation 3D du globe terrestre, donn\u00e9es m\u00e9t\u00e9o en temps r\u00e9el, indice UV, qualit\u00e9 de l'air et d\u00e9tection de menaces.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![Tests](https://github.com/Johan-Agouni/weather-aggregator-api/actions/workflows/ci.yml/badge.svg)

---

## Fonctionnalit\u00e9s

### Dashboard M\u00e9t\u00e9o
- **Globe 3D** (Globe.gl) \u2014 Cliquez n'importe o\u00f9 sur la Terre pour obtenir la m\u00e9t\u00e9o
- **M\u00e9t\u00e9o en temps r\u00e9el** \u2014 Temp\u00e9rature, conditions, humidit\u00e9, vent, pr\u00e9cipitations
- **Indice UV** avec barre gradient et niveaux de risque
- **Qualit\u00e9 de l'air** (AQI, PM2.5, PM10) avec recommandations sant\u00e9
- **Pr\u00e9visions 7 jours** avec visualisation Chart.js
- **Autocompl\u00e9tion ville** via Nominatim OpenStreetMap
- **G\u00e9olocalisation** int\u00e9gr\u00e9e
- **Export de donn\u00e9es** (JSON / CSV)

### Syst\u00e8me de S\u00e9curit\u00e9
- **Helmet** \u2014 En-t\u00eates HTTP s\u00e9curis\u00e9s avec CSP strict
- **Bannissement IP** \u2014 Protection automatique type fail2ban avec scoring
- **D\u00e9tection d'attaques** \u2014 Injection SQL, XSS, Path Traversal, Injection de commandes
- **Rate Limiting adaptatif** \u2014 Protection \u00e0 3 niveaux
- **Analyse de patterns** \u2014 D\u00e9tection de comportements de scan
- **Logging Winston** \u2014 Logs de s\u00e9curit\u00e9 structur\u00e9s avec rotation quotidienne
- **Dashboard temps r\u00e9el** \u2014 Visualisation des menaces en direct sur `/admin/`

---

## D\u00e9marrage rapide

### Pr\u00e9requis
- Node.js >= 16.0.0

### Installation

```bash
git clone https://github.com/Johan-Agouni/weather-aggregator-api.git
cd weather-aggregator-api
npm install
cp .env.example .env
npm start
```

### D\u00e9veloppement

```bash
npm run dev     # Rechargement auto avec Nodemon
npm test        # Jest avec couverture
npm run lint    # ESLint
```

### Acc\u00e8s

| Page | URL |
|------|-----|
| Dashboard M\u00e9t\u00e9o | http://localhost:3000 |
| Dashboard S\u00e9curit\u00e9 | http://localhost:3000/admin/ |
| Health Check | http://localhost:3000/health |

---

## Structure du projet

```
atmosphere-api/
\u251c\u2500\u2500 public/
\u2502   \u251c\u2500\u2500 index.html              # Dashboard principal (Globe 3D)
\u2502   \u251c\u2500\u2500 style.css               # Th\u00e8me Dark Observatory
\u2502   \u251c\u2500\u2500 script.js               # Globe.gl, autocompl\u00e9tion, graphiques
\u2502   \u251c\u2500\u2500 favicon.svg
\u2502   \u2514\u2500\u2500 admin/                  # Dashboard s\u00e9curit\u00e9
\u2502       \u251c\u2500\u2500 index.html
\u2502       \u251c\u2500\u2500 security-dashboard.css
\u2502       \u2514\u2500\u2500 security-dashboard.js
\u251c\u2500\u2500 src/
\u2502   \u251c\u2500\u2500 server.js               # Serveur Express
\u2502   \u251c\u2500\u2500 controllers/
\u2502   \u2502   \u2514\u2500\u2500 weatherController.js
\u2502   \u251c\u2500\u2500 routes/
\u2502   \u2502   \u2514\u2500\u2500 weather.js
\u2502   \u251c\u2500\u2500 services/               # Int\u00e9grations API externes
\u2502   \u2502   \u251c\u2500\u2500 openMeteoService.js
\u2502   \u2502   \u251c\u2500\u2500 uvIndexService.js
\u2502   \u2502   \u251c\u2500\u2500 airQualityService.js
\u2502   \u2502   \u2514\u2500\u2500 forecastService.js
\u2502   \u251c\u2500\u2500 utils/
\u2502   \u2502   \u251c\u2500\u2500 cache.js
\u2502   \u2502   \u251c\u2500\u2500 validator.js
\u2502   \u2502   \u2514\u2500\u2500 weatherCodes.js
\u2502   \u2514\u2500\u2500 security/
\u2502       \u251c\u2500\u2500 middleware/          # Middlewares de s\u00e9curit\u00e9
\u2502       \u2502   \u251c\u2500\u2500 securityHeaders.js
\u2502       \u2502   \u251c\u2500\u2500 attackDetection.js
\u2502       \u2502   \u251c\u2500\u2500 ipBan.js
\u2502       \u2502   \u251c\u2500\u2500 rateLimiting.js
\u2502       \u2502   \u2514\u2500\u2500 dashboardAuth.js
\u2502       \u251c\u2500\u2500 monitoring/
\u2502       \u2502   \u251c\u2500\u2500 analytics.js
\u2502       \u2502   \u2514\u2500\u2500 logger.js
\u2502       \u251c\u2500\u2500 routes/
\u2502       \u2502   \u2514\u2500\u2500 securityRoutes.js
\u2502       \u2514\u2500\u2500 utils/
\u2502           \u2514\u2500\u2500 threatDetection.js
\u251c\u2500\u2500 tests/
\u2502   \u251c\u2500\u2500 unit/
\u2502   \u2514\u2500\u2500 integration/
\u251c\u2500\u2500 SECURITY.md
\u2514\u2500\u2500 package.json
```

---

## Endpoints API

### M\u00e9t\u00e9o

```
GET /api/weather?lat={lat}&lon={lon}
GET /api/forecast?lat={lat}&lon={lon}
```

### S\u00e9curit\u00e9

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

### Variables d'environnement

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

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Backend | Node.js, Express, Helmet, Winston, node-cache |
| Frontend | Vanilla JS, Globe.gl, Chart.js, CSS custom properties |
| APIs | Open-Meteo (m\u00e9t\u00e9o + qualit\u00e9 air), CurrentUVIndex, Nominatim OSM |
| Tests | Jest, Supertest |
| CI/CD | GitHub Actions |
| Linting | ESLint 9, Prettier |

---

## Tests

```bash
npm test                    # 84 tests, 9 suites
npm run test:watch          # Mode watch
npm run lint                # ESLint
```

---

## S\u00e9curit\u00e9

Voir [SECURITY.md](SECURITY.md) pour la documentation compl\u00e8te, incluant :
- Patterns de d\u00e9tection et scoring des menaces
- Seuils de bannissement IP et configuration
- Niveaux de rate limiting
- Architecture du pipeline middleware
- Fonctionnalit\u00e9s du dashboard de s\u00e9curit\u00e9

---

## Licence

MIT \u2014 voir [LICENSE](LICENSE)

---

## Auteur

**Johan Agouni**

- GitHub : [@Johan-Agouni](https://github.com/Johan-Agouni)
