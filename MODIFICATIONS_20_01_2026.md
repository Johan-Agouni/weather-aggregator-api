# 🔧 MODIFICATIONS APPLIQUÉES - 20/01/2026

## ✅ FICHIERS MODIFIÉS

### 1. `src/security/data/banned-ips.json`
**Action :** Fichier vidé (tous les bans supprimés)
```json
{}
```

### 2. `src/server.js`

#### Modification A : Whitelist endpoint /unban (ligne ~73)
**Avant :**
```javascript
// 6. IP ban check (must be early)
app.use(banCheckMiddleware);
```

**Après :**
```javascript
// 6. IP ban check (must be early, but whitelist unban endpoint)
app.use((req, res, next) => {
    // Whitelist unban endpoint pour permettre le débannissement
    if (req.path.startsWith('/api/security/unban/')) {
        return next();
    }
    return banCheckMiddleware(req, res, next);
});
```

**Effet :** Tu peux maintenant débannir une IP même si tu es banni !

---

#### Modification B : Whitelist endpoints du dashboard (ligne ~99)
**Avant :**
```javascript
// Apply strict rate limiting to security routes
app.use('/api/security', strictLimiter);
```

**Après :**
```javascript
// Apply rate limiting to security routes (whitelist dashboard endpoints)
app.use('/api/security', (req, res, next) => {
    // Dashboard endpoints = pas de rate limit strict (auto-refresh toutes les 5s)
    const dashboardEndpoints = ['/stats', '/events', '/banned-ips', '/suspicious-ips'];
    
    const isDashboard = dashboardEndpoints.some(endpoint => req.path.startsWith(endpoint));
    
    if (isDashboard) {
        return next(); // Skip strict rate limiting for dashboard
    }
    
    // Autres endpoints = strict rate limit
    return strictLimiter(req, res, next);
});
```

**Effet :** Le dashboard peut se rafraîchir toutes les 5 secondes sans se bannir !

---

### 3. `src/security/middleware/ipBan.js`

**Modification :** Seuils de bannissement augmentés (ligne ~157)

**Avant :**
```javascript
const BAN_THRESHOLD_SCORE = 100;
const BAN_THRESHOLD_ATTEMPTS = 10;
```

**Après :**
```javascript
const BAN_THRESHOLD_SCORE = 300;
const BAN_THRESHOLD_ATTEMPTS = 20;
```

**Effet :** Plus tolérant pendant les tests (score x3, tentatives x2)

---

## 🎯 CE QUI EST MAINTENANT POSSIBLE

✅ **Dashboard fonctionne sans se bannir**
   - Auto-refresh toutes les 5 secondes
   - Requêtes illimitées vers /stats, /events, etc.

✅ **Débannissement possible même si banni**
   - `curl -X POST http://localhost:3000/api/security/unban/127.0.0.1` fonctionne

✅ **Plus de marge pour les tests**
   - Score : 100 → 300 (faut 6 attaques SQL au lieu de 2)
   - Tentatives : 10 → 20 (double)

---

## 🚀 PROCHAINES ÉTAPES

1. **Redémarre le serveur :**
   ```bash
   npm start
   ```

2. **Vérifie que tu n'es plus banni :**
   ```bash
   curl "http://localhost:3000/api/weather?lat=43.5&lon=5.4"
   ```

3. **Teste le dashboard :**
   - http://localhost:3000/admin/security
   - Devrait se rafraîchir toutes les 5s sans problème

4. **Teste les attaques :**
   ```bash
   # SQL Injection
   curl "http://localhost:3000/api/weather?lat=1' OR '1'='1&lon=5"
   
   # XSS
   curl "http://localhost:3000/api/weather?lat=<script>&lon=5"
   
   # Check le dashboard après
   ```

---

## 📊 DIFFÉRENCES CLÉS

| Avant | Après |
|-------|-------|
| Dashboard → ban après 25s | Dashboard → jamais de ban |
| Impossible de se débannir si banni | Débannissement possible |
| Ban après 2 attaques SQL (100 points) | Ban après 6 attaques SQL (300 points) |
| Ban après 10 tentatives | Ban après 20 tentatives |

---

**Date :** 20 janvier 2026  
**Modifications par :** Claude (Assistant)  
**Testé :** ❌ En attente de redémarrage serveur
