# AtmoSphere

**Dashboard météo interactif avec globe 3D et monitoring de sécurité en temps réel**

Visualisation 3D du globe terrestre, données météo en temps réel, indice UV, qualité de l'air et détection de menaces.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![Tests](https://github.com/Johan-Agouni/weather-aggregator-api/actions/workflows/ci.yml/badge.svg)

---

## Fonctionnalités

### Dashboard Météo
- **Globe 3D** (Globe.gl) — Cliquez n'importe où sur la Terre pour obtenir la météo
- **Météo en temps réel** — Température, conditions, humidité, vent, précipitations
- **Indice UV** avec barre gradient et niveaux de risque
- **Qualité de l'air** (AQI, PM2.5, PM10) avec recommandations santé
- **Prévisions 7 jours** avec visualisation Chart.js
- **Autocomplétion ville** via Nominatim OpenStreetMap
- **Géolocalisation** intégrée
- **Export de données** (JSON / CSV)

### Système de Sécurité
- **Helmet** — En-têtes HTTP sécurisés avec CSP strict
- **Bannissement IP** — Protection automatique type fail2ban avec scoring
- **Détection d'attaques** — Injection SQL, XSS, Path Traversal, Injection de commandes
- **Rate Limiting adaptatif** — Protection à 3 niveaux
- **Analyse de patterns** — Détection de comportements de scan
- **Logging Winston** — Logs de sécurité structurés avec rotation quotidienne
- **Dashboard temps réel** — Visualisation des menaces en direct sur `/admin/`

---

## Démarrage rapide

### Prérequis
- Node.js >= 16.0.0

### Installation

```bash
git clone https://github.com/Johan-Agouni/weather-aggregator-api.git
cd weather-aggregator-api
npm install
cp .env.example .env
npm start
```

### Développement

```bash
npm run dev     # Rechargement auto avec Nodemon
npm test        # Jest avec couverture
npm run lint    # ESLint
```

### Accès

| Page | URL |
|------|-----|
| Dashboard Météo | http://localhost:3000 |
| Dashboard Sécurité | http://localhost:3000/admin/ |
| Health Check | http://localhost:3000/health |

---

## Structure du projet

```
atmosphere-api/
├── public/
│   ├── index.html              # Dashboard principal (Globe 3D)
│   ├── style.css               # Thème Dark Observatory
│   ├── script.js               # Globe.gl, autocomplétion, graphiques
│   ├── favicon.svg
│   └── admin/                  # Dashboard sécurité
│       ├── index.html
│       ├── security-dashboard.css
│       └── security-dashboard.js
├── src/
│   ├── server.js               # Serveur Express
│   ├── controllers/
│   │   └── weatherController.js
│   ├── routes/
│   │   └── weather.js
│   ├── services/               # Intégrations API externes
│   │   ├── openMeteoService.js
│   │   ├── uvIndexService.js
│   │   ├── airQualityService.js
│   │   └── forecastService.js
│   ├── utils/
│   │   ├── cache.js
│   │   ├── validator.js
│   │   └── weatherCodes.js
│   └── security/
│       ├── middleware/          # Middlewares de sécurité
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

## Endpoints API

### Météo

```
GET /api/weather?lat={lat}&lon={lon}
GET /api/forecast?lat={lat}&lon={lon}
```

### Sécurité

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
| APIs | Open-Meteo (météo + qualité air), CurrentUVIndex, Nominatim OSM |
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

## Sécurité

Voir [SECURITY.md](SECURITY.md) pour la documentation complète, incluant :
- Patterns de détection et scoring des menaces
- Seuils de bannissement IP et configuration
- Niveaux de rate limiting
- Architecture du pipeline middleware
- Fonctionnalités du dashboard de sécurité

---

## Licence

MIT — voir [LICENSE](LICENSE)

---

## Auteur

**Johan Agouni**

- GitHub : [@Johan-Agouni](https://github.com/Johan-Agouni)
