/**
 * AtmoSphere — Frontend Script
 *
 * Globe.gl 3D visualization + real-time weather data
 * Features: 3D globe, city autocomplete, geolocation,
 * search history, favorites, JSON/CSV export, Chart.js forecast
 */

// ====================
// STATE
// ====================
const state = {
    globe: null,
    forecastChart: null,
    currentWeatherData: null,
    currentForecastData: null,
    currentLocation: null,
    markers: [],
    autocompleteTimeout: null,
    selectedIndex: -1,
    suggestions: [],
    isGlobeReady: false,
};

const STORAGE_KEYS = {
    HISTORY: 'weather_search_history',
    FAVORITES: 'weather_favorites',
    LAST_LOCATION: 'weather_last_location',
};

// ====================
// DOM REFERENCES
// ====================
const coordsBtn = document.getElementById('coordsBtn');
const cityInput = document.getElementById('cityInput');
const latInput = document.getElementById('latInput');
const lonInput = document.getElementById('lonInput');
const autocompleteDropdown = document.getElementById('autocomplete');
const toggleCoordsBtn = document.getElementById('toggleCoordsBtn');
const coordsPanel = document.getElementById('coordsPanel');
const exportBtn = document.getElementById('exportBtn');
const exportMenu = document.getElementById('exportMenu');

// ====================
// GLOBE INITIALIZATION
// ====================

/**
 * Check for WebGL support
 */
function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
    } catch (_e) {
        return false;
    }
}

/**
 * Initialize Globe.gl 3D globe
 */
function initGlobe() {
    const container = document.getElementById('globeContainer');
    if (!container) return;

    if (!hasWebGL() || typeof Globe === 'undefined') {
        // Fallback: static globe image with CSS rotation
        container.innerHTML = `
            <div class="globe-fallback">
                <div class="globe-static"></div>
                <p class="globe-fallback-text">Click a city above to search</p>
            </div>`;
        return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    state.globe = Globe()
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .width(width)
        .height(height)
        .atmosphereColor('#3B82F6')
        .atmosphereAltitude(0.25)
        .pointsData([])
        .pointColor(() => '#F59E0B')
        .pointAltitude(0.05)
        .pointRadius(0.6)
        .pointsMerge(false)
        .onGlobeClick(({ lat, lng }) => {
            handleGlobeClick(lat, lng);
        })(container);

    // Auto-rotation
    state.globe.controls().autoRotate = true;
    state.globe.controls().autoRotateSpeed = 0.5;
    state.globe.controls().enableZoom = true;

    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
        if (state.globe) {
            state.globe.width(container.clientWidth);
            state.globe.height(container.clientHeight);
        }
    });
    resizeObserver.observe(container);

    state.isGlobeReady = true;
    console.log('[GLOBE] Initialized');
}

/**
 * Handle click on globe — reverse geocode and fetch weather
 */
async function handleGlobeClick(lat, lng) {
    // Stop auto-rotation on interaction
    if (state.globe) {
        state.globe.controls().autoRotate = false;
    }

    animateGlobeToLocation(lat, lng);

    // Reverse geocode
    let cityName = null;
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
            { headers: { 'User-Agent': 'AtmoSphere/1.0' } }
        );
        if (response.ok) {
            const data = await response.json();
            const addr = data.address || {};
            cityName = addr.city || addr.town || addr.village || addr.county || data.display_name.split(',')[0];
        }
    } catch (error) {
        console.warn('[REVERSE GEOCODE]', error);
    }

    getWeatherData(lat, lng, cityName);
}

/**
 * Animate globe to focus on lat/lng + add marker
 */
function animateGlobeToLocation(lat, lng) {
    if (!state.globe || !state.isGlobeReady) return;

    // Update marker
    state.markers = [{ lat, lng }];
    state.globe.pointsData(state.markers);

    // Animate camera
    state.globe.pointOfView({ lat, lng, altitude: 1.8 }, 1000);
}

// ====================
// DROPDOWN HANDLERS
// ====================

function setupDropdowns() {
    // Coords panel toggle
    if (toggleCoordsBtn && coordsPanel) {
        toggleCoordsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            coordsPanel.classList.toggle('hidden');
            // Close other menus
            if (exportMenu) exportMenu.classList.add('hidden');
        });
    }

    // Export menu toggle
    if (exportBtn && exportMenu) {
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportMenu.classList.toggle('hidden');
            // Close other menus
            if (coordsPanel) coordsPanel.classList.add('hidden');
        });
    }

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
        if (coordsPanel) coordsPanel.classList.add('hidden');
        if (exportMenu) exportMenu.classList.add('hidden');
    });

    // Prevent closing when clicking inside dropdown panels
    document.querySelectorAll('.dropdown-panel').forEach(panel => {
        panel.addEventListener('click', (e) => e.stopPropagation());
    });

    // Geolocation button
    const geolocateBtn = document.getElementById('geolocateBtn');
    if (geolocateBtn) {
        geolocateBtn.addEventListener('click', getUserLocation);
    }

    // Export buttons
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportDataJSON);
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportDataCSV);
}

// ====================
// EVENT LISTENERS
// ====================

// City search — pressing Enter fires searchByCity
cityInput.addEventListener('input', handleCityInput);
cityInput.addEventListener('keydown', handleKeyboardNavigation);
cityInput.addEventListener('blur', () => {
    setTimeout(() => hideAutocomplete(), 200);
});

// Coordinates search
if (coordsBtn) {
    coordsBtn.addEventListener('click', searchByCoords);
}
if (latInput) {
    latInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchByCoords();
    });
}
if (lonInput) {
    lonInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchByCoords();
    });
}

// ====================
// GEOLOCATION
// ====================

function getUserLocation() {
    if (!navigator.geolocation) {
        showError('La géolocalisation n\'est pas supportée par votre navigateur');
        return;
    }

    showLoading();
    hideError();

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            console.log(`[GEOLOCATION] ${lat}, ${lon}`);
            if (latInput) latInput.value = lat.toFixed(4);
            if (lonInput) lonInput.value = lon.toFixed(4);

            animateGlobeToLocation(lat, lon);
            getWeatherData(lat, lon, 'Ma Position');
        },
        (error) => {
            hideLoading();
            const msgs = {
                1: 'Géolocalisation refusée. Veuillez autoriser l\'accès à votre position.',
                2: 'Position indisponible. Vérifiez votre connexion GPS.',
                3: 'Délai de géolocalisation dépassé. Réessayez.',
            };
            showError(msgs[error.code] || 'Erreur de géolocalisation');
            console.error('[GEOLOCATION ERROR]', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ====================
// SEARCH HISTORY
// ====================

function saveToHistory(location) {
    try {
        let history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || [];
        history = history.filter(item => !(item.lat === location.lat && item.lon === location.lon));
        history.unshift({ ...location, timestamp: new Date().toISOString() });
        history = history.slice(0, 10);
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (error) {
        console.error('[HISTORY ERROR]', error);
    }
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || [];
    } catch (_error) {
        return [];
    }
}

// ====================
// AUTOCOMPLETE
// ====================

function handleCityInput(e) {
    const query = e.target.value.trim();
    if (query.length < 1) {
        hideAutocomplete();
        return;
    }
    clearTimeout(state.autocompleteTimeout);
    state.autocompleteTimeout = setTimeout(() => {
        fetchCitySuggestions(query);
    }, 300);
}

async function fetchCitySuggestions(query) {
    try {
        showAutocompleteLoading();
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=12&accept-language=fr&addressdetails=1`,
            { headers: { 'User-Agent': 'AtmoSphere/1.0' } }
        );
        if (!response.ok) throw new Error('Autocomplete API error');
        const data = await response.json();

        // Filtrer : garder uniquement les vrais lieux habités dont le nom correspond
        const validClasses = ['place', 'boundary'];
        const validPlaceTypes = ['city', 'town', 'village', 'municipality', 'hamlet', 'suburb', 'borough'];
        const queryLower = query.toLowerCase();
        const filtered = data.filter(item => {
            const addr = item.address || {};
            const name = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || '';
            // Le nom de la ville doit commencer par la requête tapée
            if (name && !name.toLowerCase().startsWith(queryLower)) return false;
            if (validClasses.includes(item.class) && validPlaceTypes.includes(item.type)) return true;
            if (item.class === 'boundary' && item.type === 'administrative') {
                return !!(addr.city || addr.town || addr.village || addr.municipality);
            }
            return false;
        });

        // Trier par importance (les grandes villes en premier)
        filtered.sort((a, b) => (b.importance || 0) - (a.importance || 0));

        // Dédupliquer par nom de ville + pays
        const seen = new Set();
        const unique = filtered.filter(item => {
            const addr = item.address || {};
            const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || '';
            const country = addr.country_code || '';
            const key = `${city.toLowerCase()}|${country}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, 6);

        state.suggestions = unique;
        displaySuggestions(unique);
    } catch (error) {
        console.error('[AUTOCOMPLETE ERROR]', error);
        hideAutocomplete();
    }
}

function showAutocompleteLoading() {
    autocompleteDropdown.innerHTML = '<div class="autocomplete-loading">Recherche...</div>';
    autocompleteDropdown.classList.remove('hidden');
}

function displaySuggestions(data) {
    if (data.length === 0) {
        autocompleteDropdown.innerHTML = '<div class="autocomplete-loading">Aucune ville trouvée</div>';
        return;
    }
    autocompleteDropdown.innerHTML = '';
    state.selectedIndex = -1;

    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.dataset.index = index;

        // Afficher : Ville, Région/État, Pays
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || item.display_name.split(',')[0];
        const region = addr.state || addr.county || '';
        const country = addr.country || '';
        div.textContent = region ? `${city}, ${region}, ${country}` : `${city}, ${country}`;

        div.addEventListener('click', () => selectSuggestion(item));
        autocompleteDropdown.appendChild(div);
    });

    autocompleteDropdown.classList.remove('hidden');
}

function selectSuggestion(item) {
    const addr = item.address || {};
    const cityName = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || item.display_name.split(',')[0];
    cityInput.value = cityName;
    hideAutocomplete();

    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    animateGlobeToLocation(lat, lon);
    getWeatherData(lat, lon, cityName);
}

function handleKeyboardNavigation(e) {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    if (items.length === 0 && e.key !== 'Enter') return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.selectedIndex = Math.min(state.selectedIndex + 1, items.length - 1);
        updateSelection(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.selectedIndex = Math.max(state.selectedIndex - 1, 0);
        updateSelection(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (state.selectedIndex >= 0 && state.suggestions[state.selectedIndex]) {
            selectSuggestion(state.suggestions[state.selectedIndex]);
        } else {
            searchByCity();
        }
    } else if (e.key === 'Escape') {
        hideAutocomplete();
    }
}

function updateSelection(items) {
    items.forEach((item, index) => {
        if (index === state.selectedIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

function hideAutocomplete() {
    autocompleteDropdown.classList.add('hidden');
    autocompleteDropdown.innerHTML = '';
    state.selectedIndex = -1;
    state.suggestions = [];
}

// ====================
// SEARCH FUNCTIONS
// ====================

async function searchByCity() {
    const city = cityInput.value.trim();
    if (!city) {
        showError('Veuillez entrer un nom de ville');
        return;
    }

    hideAutocomplete();
    showLoading();
    hideError();

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&accept-language=fr`,
            { headers: { 'User-Agent': 'AtmoSphere/1.0' } }
        );
        if (!response.ok) throw new Error('Geocoding API error');
        const data = await response.json();

        if (data.length === 0) {
            hideLoading();
            showError('Ville non trouvée. Vérifiez l\'orthographe.');
            return;
        }

        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const cityName = data[0].display_name.split(',')[0];

        animateGlobeToLocation(lat, lon);
        await getWeatherData(lat, lon, cityName);
    } catch (error) {
        hideLoading();
        showError('Erreur lors de la recherche. Réessayez.');
        console.error('[GEOCODING ERROR]', error);
    }
}

async function searchByCoords() {
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);

    if (isNaN(lat) || isNaN(lon)) {
        showError('Coordonnées invalides');
        return;
    }
    if (lat < -90 || lat > 90) {
        showError('Latitude invalide (doit être entre -90 et 90)');
        return;
    }
    if (lon < -180 || lon > 180) {
        showError('Longitude invalide (doit être entre -180 et 180)');
        return;
    }

    // Close coords panel
    if (coordsPanel) coordsPanel.classList.add('hidden');

    animateGlobeToLocation(lat, lon);
    getWeatherData(lat, lon);
}

// ====================
// WEATHER DATA
// ====================

async function getWeatherData(lat, lon, cityName = null) {
    showLoading();
    hideError();
    hideResults();

    state.currentForecastData = null;

    try {
        console.log(`[API] Fetching weather for ${lat}, ${lon}`);

        const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erreur serveur');
        }

        state.currentWeatherData = data;
        state.currentLocation = { lat, lon, name: cityName };

        saveToHistory({ lat, lon, name: cityName || `${lat.toFixed(2)}, ${lon.toFixed(2)}` });

        displayResults(data, cityName);

        // Auto-load forecast
        loadForecast(lat, lon);
    } catch (error) {
        showError(error.message);
        console.error('[API ERROR]', error);
    } finally {
        hideLoading();
    }
}

// ====================
// DISPLAY RESULTS
// ====================

function displayResults(data, cityName) {
    // Location badge
    const name = cityName || `${data.location.lat}, ${data.location.lon}`;
    document.getElementById('locationName').textContent = name;
    document.getElementById('coordinates').textContent = `${data.location.lat.toFixed(4)}°N, ${data.location.lon.toFixed(4)}°E`;
    document.getElementById('timestamp').textContent = new Date(data.timestamp).toLocaleString('fr-FR');

    // Show location badge
    const badge = document.getElementById('locationBadge');
    if (badge) badge.classList.remove('hidden');

    // Hide hero hint
    const heroHint = document.getElementById('heroHint');
    if (heroHint) heroHint.style.opacity = '0';

    // Weather card
    document.getElementById('temperature').textContent = `${data.weather.temperature}°C`;
    document.getElementById('conditions').textContent = data.weather.conditions;
    document.getElementById('humidity').textContent = `${data.weather.humidity}%`;
    document.getElementById('wind').textContent = `${data.weather.wind_speed} km/h`;
    document.getElementById('precipitation').textContent = `${data.weather.precipitation} mm`;

    // Weather icon (jour/nuit selon l'heure locale)
    const night = isNightTime(data.location.lat, data.location.lon);
    const weatherIcon = getWeatherIcon(data.weather.weather_code, night);
    document.getElementById('weatherIcon').innerHTML = weatherIcon;

    // UV Index
    const uvValue = data.uv.uv_index !== null ? data.uv.uv_index : 'N/A';
    document.getElementById('uvIndex').textContent = uvValue === 0 ? '0' : uvValue;

    // UV bar position (0–11+ scale mapped to 0–100%)
    const uvBar = document.getElementById('uvBarFill');
    if (uvBar && typeof uvValue === 'number') {
        const pct = Math.min((uvValue / 11) * 100, 100);
        uvBar.style.left = `${pct}%`;
    }

    // UV risk badge
    const uvRisk = document.getElementById('uvRisk');
    uvRisk.textContent = data.uv.risk_level;
    uvRisk.className = 'status-badge uv-' + data.uv.risk_level.toLowerCase().replace(/\s+/g, '-');

    // Air quality
    document.getElementById('aqi').textContent = data.air_quality.aqi !== null ? data.air_quality.aqi : 'N/A';
    document.getElementById('pm25').textContent = data.air_quality.pm2_5 ? `${data.air_quality.pm2_5} µg/m³` : 'N/A';
    document.getElementById('pm10').textContent = data.air_quality.pm10 ? `${data.air_quality.pm10} µg/m³` : 'N/A';

    const airQuality = document.getElementById('airQuality');
    airQuality.textContent = data.air_quality.quality;
    airQuality.className = 'status-badge air-' + data.air_quality.quality.toLowerCase().replace(/[^a-z]/g, '-').replace(/-+/g, '-');

    // Recommendations
    const recList = document.getElementById('recommendationsList');
    recList.innerHTML = '';
    data.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        recList.appendChild(li);
    });

    showResults();
    console.log('[SUCCESS] Weather data displayed');
}

// ====================
// WEATHER HELPERS
// ====================

/**
 * Déterminer si c'est la nuit à une position donnée (approximation solaire)
 */
function isNightTime(lat, lon) {
    const now = new Date();
    // Heure UTC décimale
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    // Heure locale approximative basée sur la longitude
    const localHours = (utcHours + lon / 15 + 24) % 24;
    // Jour de l'année
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    // Déclinaison solaire simplifiée
    const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
    const latRad = lat * Math.PI / 180;
    const declRad = declination * Math.PI / 180;
    // Angle horaire du lever/coucher
    const cosHA = -Math.tan(latRad) * Math.tan(declRad);
    // Cas polaires
    if (cosHA < -1) return false; // soleil de minuit
    if (cosHA > 1) return true;   // nuit polaire
    const ha = Math.acos(cosHA) * 180 / Math.PI;
    const sunrise = 12 - ha / 15;
    const sunset = 12 + ha / 15;
    return localHours < sunrise || localHours > sunset;
}

function getWeatherIcon(weatherCode, night) {
    // Icône lune pour la nuit
    const moonSvg = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M36 8C22.7 8 12 18.7 12 32s10.7 24 24 24c7.4 0 14-3.4 18.4-8.6-2.8 1.2-5.9 1.8-9.2 1.8C32.4 49.2 22 38.8 22 26c0-7.2 3.3-13.7 8.5-18C33.3 8 34.6 8 36 8z" fill="#CBD5E1"/>
        <circle cx="38" cy="18" r="1" fill="#E2E8F0" opacity="0.6"/>
        <circle cx="46" cy="28" r="1.5" fill="#E2E8F0" opacity="0.4"/>
        <circle cx="50" cy="14" r="0.8" fill="#E2E8F0" opacity="0.5"/>
    </svg>`;
    const moonCloudSvg = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 6C22 6 15 11 13 18c-1-.3-2-.5-3-.5C4.5 17.5 0 22 0 27.5S4.5 37 10 37h2" fill="none"/>
        <path d="M34 8c-7.2 0-13.2 4.7-15.3 11.2" fill="none"/>
        <path d="M40 4C33.6 4 28.5 8.3 27 14" fill="none"/>
        <path d="M38 6c-5 2-8.5 7.5-8 13.5" fill="none"/>
        <path d="M44 10a14 14 0 0 0-12 6" fill="none"/>
        <path d="M36 8C22.7 8 15 16 15 24c0 2 .3 3 1 5" fill="none"/>
        <path d="M28 4c-3 1.5-5.5 4-6.8 7" fill="none"/>
        <circle cx="36" cy="16" r="8" fill="#CBD5E1"/>
        <circle cx="31" cy="16" r="8" fill="#0B0D17"/>
        <path d="M20 48c-6 0-11-4-11-9s5-9 11-9c.8-5 5.5-9 11.5-9 7 0 12.5 5 12.5 11 0 .4 0 .8-.1 1.1C49 32.7 53 36.5 53 41.5 53 46 49 48 44 48H20z" fill="#94A3B8" opacity="0.7"/>
    </svg>`;

    const icons = {
        // Ciel dégagé
        0: night ? moonSvg : `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="12" fill="#F59E0B"/>
            <g stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round">
                <line x1="32" y1="4" x2="32" y2="12"/><line x1="32" y1="52" x2="32" y2="60"/>
                <line x1="4" y1="32" x2="12" y2="32"/><line x1="52" y1="32" x2="60" y2="32"/>
                <line x1="12.2" y1="12.2" x2="17.9" y2="17.9"/><line x1="46.1" y1="46.1" x2="51.8" y2="51.8"/>
                <line x1="51.8" y1="12.2" x2="46.1" y2="17.9"/><line x1="17.9" y1="46.1" x2="12.2" y2="51.8"/>
            </g></svg>`,
        // Principalement dégagé
        1: night ? moonCloudSvg : `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="22" r="10" fill="#F59E0B"/>
            <g stroke="#F59E0B" stroke-width="2" stroke-linecap="round">
                <line x1="24" y1="4" x2="24" y2="9"/><line x1="24" y1="35" x2="24" y2="38"/>
                <line x1="8" y1="22" x2="12" y2="22"/><line x1="36" y1="22" x2="40" y2="22"/>
                <line x1="12.7" y1="10.7" x2="16.2" y2="14.2"/><line x1="31.8" y1="29.8" x2="35.3" y2="33.3"/>
                <line x1="35.3" y1="10.7" x2="31.8" y2="14.2"/>
            </g>
            <path d="M22 44c-5.5 0-10-3.6-10-8s4.5-8 10-8c.7-4.5 5-8 10.5-8 6.4 0 11.5 4.5 11.5 10 0 .3 0 .7-.1 1C48.5 31.5 52 35 52 39.5 52 44 48.4 44 44 44H22z" fill="#94A3B8" opacity="0.5"/>
            </svg>`,
        // Partiellement nuageux
        2: night ? moonCloudSvg : `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="20" r="9" fill="#F59E0B"/>
            <g stroke="#F59E0B" stroke-width="2" stroke-linecap="round">
                <line x1="22" y1="4" x2="22" y2="8"/><line x1="8" y1="20" x2="12" y2="20"/>
                <line x1="12" y1="10" x2="15" y2="13"/><line x1="32" y1="10" x2="29" y2="13"/>
            </g>
            <path d="M20 48c-6 0-11-4-11-9s5-9 11-9c.8-5 5.5-9 11.5-9 7 0 12.5 5 12.5 11 0 .4 0 .8-.1 1.1C49 32.7 53 36.5 53 41.5 53 46 49 48 44 48H20z" fill="#94A3B8"/>
            </svg>`,
        // Couvert
        3: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 46c-6.6 0-12-4.2-12-9.5S9.4 27 16 27c1-5.5 6-10 12.5-10 7.6 0 13.8 5.2 13.8 11.5 0 .5 0 .9-.1 1.3C47.3 30.5 52 34.8 52 40c0 5.5-4.9 6-10 6H16z" fill="#64748B"/>
            </svg>`,
        // Brouillard
        45: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g stroke="#94A3B8" stroke-width="3" stroke-linecap="round">
                <line x1="10" y1="22" x2="54" y2="22"/>
                <line x1="6" y1="32" x2="58" y2="32"/>
                <line x1="10" y1="42" x2="54" y2="42"/>
            </g></svg>`,
        // Pluie
        61: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 36c-6 0-10-3.5-10-8s4.5-8 10-8c.8-5 5.5-9 11.5-9 7 0 12.5 5 12.5 11 0 .4 0 .7-.1 1C54 23.5 54 27 54 31c0 4-4 5-9 5H16z" fill="#64748B"/>
            <g stroke="#3B82F6" stroke-width="2" stroke-linecap="round">
                <line x1="20" y1="42" x2="18" y2="50"/><line x1="30" y1="42" x2="28" y2="50"/>
                <line x1="40" y1="42" x2="38" y2="50"/>
            </g></svg>`,
        // Neige
        71: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 36c-6 0-10-3.5-10-8s4.5-8 10-8c.8-5 5.5-9 11.5-9 7 0 12.5 5 12.5 11 0 .4 0 .7-.1 1C54 23.5 54 27 54 31c0 4-4 5-9 5H16z" fill="#64748B"/>
            <g fill="#E2E8F0">
                <circle cx="20" cy="46" r="2.5"/><circle cx="32" cy="48" r="2.5"/>
                <circle cx="44" cy="45" r="2.5"/><circle cx="26" cy="54" r="2"/>
                <circle cx="38" cy="55" r="2"/>
            </g></svg>`,
        // Orage
        95: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 34c-6 0-10-3.5-10-8s4.5-8 10-8c.8-5 5.5-9 11.5-9 7 0 12.5 5 12.5 11 0 .4 0 .7-.1 1C54 21.5 54 25 54 29c0 4-4 5-9 5H16z" fill="#475569"/>
            <polygon points="34,34 28,46 33,46 29,58 40,42 35,42 38,34" fill="#F59E0B"/>
            </svg>`,
    };

    // Aliases pour les codes similaires
    icons[48] = icons[45]; // Brouillard givrant
    icons[51] = icons[61]; icons[53] = icons[61]; icons[55] = icons[61]; // Bruine
    icons[63] = icons[61]; icons[65] = icons[61]; // Pluie modérée/forte
    icons[66] = icons[61]; icons[67] = icons[61]; // Pluie verglaçante
    icons[80] = icons[61]; icons[81] = icons[61]; icons[82] = icons[61]; // Averses
    icons[73] = icons[71]; icons[75] = icons[71]; icons[77] = icons[71]; // Neige
    icons[85] = icons[71]; icons[86] = icons[71]; // Averses de neige
    icons[96] = icons[95]; icons[99] = icons[95]; // Orage avec grêle

    return icons[weatherCode] || icons[3];
}

// ====================
// UI HELPERS
// ====================

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    // Auto-hide after 5s
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

function hideError() {
    document.getElementById('error').classList.add('hidden');
}

function showResults() {
    document.getElementById('results').classList.remove('hidden');
}

function hideResults() {
    document.getElementById('results').classList.add('hidden');
}

// ====================
// 7-DAY FORECAST
// ====================

async function loadForecast(lat, lon) {
    const chartContainer = document.querySelector('.forecast-chart-container');
    const daysContainer = document.getElementById('forecastDays');

    try {
        if (daysContainer) daysContainer.innerHTML = '';

        console.log(`[FORECAST] Fetching for ${lat}, ${lon}`);

        const response = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch forecast');
        }

        state.currentForecastData = data;

        if (chartContainer) chartContainer.style.display = 'block';

        displayForecastChart(data.forecast);
        displayForecastDays(data.forecast);

        console.log('[FORECAST] Displayed');
    } catch (error) {
        console.error('[FORECAST ERROR]', error);
        if (daysContainer) {
            daysContainer.innerHTML = '<div class="forecast-error">Failed to load forecast data</div>';
        }
    }
}

function displayForecastChart(forecast) {
    const canvas = document.getElementById('forecastChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (state.forecastChart) {
        state.forecastChart.destroy();
    }

    const labels = forecast.days.map(day => {
        const date = new Date(day.date);
        return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    });

    const maxTemps = forecast.days.map(day => day.temp_max);
    const minTemps = forecast.days.map(day => day.temp_min);

    state.forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Max °C',
                    data: maxTemps,
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#F59E0B',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
                {
                    label: 'Min °C',
                    data: minTemps,
                    borderColor: '#06B6D4',
                    backgroundColor: 'rgba(6, 182, 212, 0.08)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#06B6D4',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: {
                legend: {
                    labels: {
                        color: '#94A3B8',
                        font: { family: 'Inter', size: 12 },
                    },
                },
                tooltip: {
                    backgroundColor: '#1E293B',
                    titleColor: '#E2E8F0',
                    bodyColor: '#CBD5E1',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    borderWidth: 1,
                    titleFont: { family: 'Inter' },
                    bodyFont: { family: 'JetBrains Mono' },
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y}°C`,
                    },
                },
            },
            scales: {
                y: {
                    ticks: {
                        color: '#64748B',
                        font: { family: 'JetBrains Mono', size: 11 },
                        callback: (value) => value + '°C',
                    },
                    grid: { color: 'rgba(148, 163, 184, 0.08)' },
                },
                x: {
                    ticks: {
                        color: '#64748B',
                        font: { family: 'Inter', size: 11 },
                    },
                    grid: { color: 'rgba(148, 163, 184, 0.08)' },
                },
            },
        },
    });
}

function displayForecastDays(forecast) {
    const container = document.getElementById('forecastDays');
    if (!container) return;
    container.innerHTML = '';

    forecast.days.forEach((day, index) => {
        const date = new Date(day.date);
        const dayName = index === 0 ? 'Aujourd\'hui' : date.toLocaleDateString('fr-FR', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        const icon = getWeatherIcon(day.weather_code);

        const dayCard = document.createElement('div');
        dayCard.className = 'forecast-day';
        dayCard.innerHTML = `
            <div class="forecast-day-date">${dayName}<br><small>${dateStr}</small></div>
            <div class="forecast-day-icon">${icon}</div>
            <div class="forecast-day-temps">
                <span class="forecast-temp-max">${Math.round(day.temp_max)}°</span>
                <span class="forecast-temp-sep">/</span>
                <span class="forecast-temp-min">${Math.round(day.temp_min)}°</span>
            </div>
            <div class="forecast-day-condition">${day.conditions}</div>
        `;
        container.appendChild(dayCard);
    });
}

// ====================
// DATA EXPORT
// ====================

function exportDataJSON() {
    const results = document.getElementById('results');
    if (results.classList.contains('hidden')) {
        showError('Aucune donnée à exporter. Effectuez d\'abord une recherche.');
        return;
    }

    const data = {
        location: {
            name: document.getElementById('locationName').textContent,
            coordinates: document.getElementById('coordinates').textContent,
        },
        timestamp: document.getElementById('timestamp').textContent,
        weather: {
            temperature: document.getElementById('temperature').textContent,
            conditions: document.getElementById('conditions').textContent,
            humidity: document.getElementById('humidity').textContent,
            wind: document.getElementById('wind').textContent,
            precipitation: document.getElementById('precipitation').textContent,
        },
        uv: {
            index: document.getElementById('uvIndex').textContent,
            risk: document.getElementById('uvRisk').textContent,
        },
        air_quality: {
            aqi: document.getElementById('aqi').textContent,
            pm25: document.getElementById('pm25').textContent,
            pm10: document.getElementById('pm10').textContent,
            quality: document.getElementById('airQuality').textContent,
        },
        recommendations: Array.from(document.getElementById('recommendationsList').children).map(li => li.textContent),
        forecast: state.currentForecastData ? state.currentForecastData.forecast : null,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weather-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Close export menu
    if (exportMenu) exportMenu.classList.add('hidden');
    console.log('[EXPORT] JSON');
}

function exportDataCSV() {
    const results = document.getElementById('results');
    if (results.classList.contains('hidden')) {
        showError('Aucune donnée à exporter. Effectuez d\'abord une recherche.');
        return;
    }

    let csv = 'Location,Coordinates,Timestamp,Temperature,Conditions,Humidity,Wind,Precipitation,UV Index,UV Risk,AQI,PM2.5,PM10,Air Quality\n';
    csv += `"${document.getElementById('locationName').textContent}",`;
    csv += `"${document.getElementById('coordinates').textContent}",`;
    csv += `"${document.getElementById('timestamp').textContent}",`;
    csv += `"${document.getElementById('temperature').textContent}",`;
    csv += `"${document.getElementById('conditions').textContent}",`;
    csv += `"${document.getElementById('humidity').textContent}",`;
    csv += `"${document.getElementById('wind').textContent}",`;
    csv += `"${document.getElementById('precipitation').textContent}",`;
    csv += `"${document.getElementById('uvIndex').textContent}",`;
    csv += `"${document.getElementById('uvRisk').textContent}",`;
    csv += `"${document.getElementById('aqi').textContent}",`;
    csv += `"${document.getElementById('pm25').textContent}",`;
    csv += `"${document.getElementById('pm10').textContent}",`;
    csv += `"${document.getElementById('airQuality').textContent}"\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weather-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (exportMenu) exportMenu.classList.add('hidden');
    console.log('[EXPORT] CSV');
}

// ====================
// EXPOSE GLOBALS
// ====================
window.getUserLocation = getUserLocation;
window.exportDataJSON = exportDataJSON;
window.exportDataCSV = exportDataCSV;

// ====================
// INITIALIZATION
// ====================
window.addEventListener('load', () => {
    console.log('[INIT] AtmoSphere');

    // Initialize Globe.gl
    initGlobe();

    // Setup dropdown toggles
    setupDropdowns();

    // Load last location or default
    const history = getHistory();
    if (history.length > 0) {
        const last = history[0];
        console.log('[INIT] Last location:', last.name);
        animateGlobeToLocation(last.lat, last.lon);
        getWeatherData(last.lat, last.lon, last.name);
    } else {
        console.log('[INIT] Default: Aix-en-Provence');
        animateGlobeToLocation(43.5297, 5.4474);
        getWeatherData(43.5297, 5.4474, 'Aix-en-Provence');
    }
});

console.log('[SCRIPT LOADED] AtmoSphere ready');
