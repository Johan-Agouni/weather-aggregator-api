/**
 * Weather Aggregator - Frontend Script
 * 
 * Features:
 * - City autocomplete with keyboard navigation
 * - Geolocation support
 * - Search history with localStorage
 * - Favorites management
 * - Responsive weather data display
 */

// ====================
// DOM ELEMENTS
// ====================
const searchBtn = document.getElementById('searchBtn');
const coordsBtn = document.getElementById('coordsBtn');
const cityInput = document.getElementById('cityInput');
const latInput = document.getElementById('latInput');
const lonInput = document.getElementById('lonInput');
const autocompleteDropdown = document.getElementById('autocomplete');

// ====================
// STATE MANAGEMENT
// ====================
let autocompleteTimeout;
let selectedIndex = -1;
let suggestions = [];

// LocalStorage keys
const STORAGE_KEYS = {
    HISTORY: 'weather_search_history',
    FAVORITES: 'weather_favorites',
    LAST_LOCATION: 'weather_last_location'
};

// ====================
// EVENT LISTENERS
// ====================
searchBtn.addEventListener('click', searchByCity);
coordsBtn.addEventListener('click', searchByCoords);

cityInput.addEventListener('input', handleCityInput);
cityInput.addEventListener('keydown', handleKeyboardNavigation);
cityInput.addEventListener('blur', () => {
    setTimeout(() => hideAutocomplete(), 200);
});

// Allow Enter key on coordinate inputs
latInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchByCoords();
});
lonInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchByCoords();
});

// ====================
// GEOLOCATION
// ====================

/**
 * Get user's current location using browser geolocation API
 */
function getUserLocation() {
    if (!navigator.geolocation) {
        showError('La géolocalisation n\'est pas supportée par votre navigateur');
        return;
    }

    showLoading();
    hideError();

    navigator.geolocation.getCurrentPosition(
        // Success callback
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            console.log(`[GEOLOCATION] User location: ${lat}, ${lon}`);
            
            // Fill coordinate inputs
            latInput.value = lat.toFixed(2);
            lonInput.value = lon.toFixed(2);
            
            getWeatherData(lat, lon, 'Ma Position');
        },
        // Error callback
        (error) => {
            hideLoading();
            let errorMessage = 'Erreur de géolocalisation';
            
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Géolocalisation refusée. Veuillez autoriser l\'accès à votre position.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Position indisponible. Vérifiez votre connexion GPS.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Délai de géolocalisation dépassé. Réessayez.';
                    break;
            }
            
            showError(errorMessage);
            console.error('[GEOLOCATION ERROR]', error);
        },
        // Options
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// ====================
// SEARCH HISTORY
// ====================

/**
 * Save search to localStorage history
 */
function saveToHistory(location) {
    try {
        let history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || [];
        
        // Remove duplicate if exists
        history = history.filter(item => 
            !(item.lat === location.lat && item.lon === location.lon)
        );
        
        // Add to beginning of array
        history.unshift({
            ...location,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 10 searches
        history = history.slice(0, 10);
        
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
        
    } catch (error) {
        console.error('[HISTORY ERROR]', error);
    }
}

/**
 * Get search history from localStorage
 */
function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || [];
    } catch (error) {
        console.error('[HISTORY ERROR]', error);
        return [];
    }
}

/**
 * Clear all search history
 */
function clearHistory() {
    try {
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
        console.log('[HISTORY] Cleared');
    } catch (error) {
        console.error('[HISTORY ERROR]', error);
    }
}

// ====================
// AUTOCOMPLETE
// ====================

/**
 * Handle city input changes with debouncing
 */
function handleCityInput(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        hideAutocomplete();
        return;
    }
    
    // Debounce API calls (300ms delay)
    clearTimeout(autocompleteTimeout);
    autocompleteTimeout = setTimeout(() => {
        fetchCitySuggestions(query);
    }, 300);
}

/**
 * Fetch city suggestions from Nominatim API
 */
async function fetchCitySuggestions(query) {
    try {
        showAutocompleteLoading();
        
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&accept-language=fr&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'WeatherAggregator/1.0'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Autocomplete API error');
        }
        
        const data = await response.json();
        suggestions = data;
        displaySuggestions(data);
        
    } catch (error) {
        console.error('[AUTOCOMPLETE ERROR]', error);
        hideAutocomplete();
    }
}

/**
 * Show loading state in autocomplete dropdown
 */
function showAutocompleteLoading() {
    autocompleteDropdown.innerHTML = '<div class=\"autocomplete-loading\">Recherche...</div>';
    autocompleteDropdown.classList.remove('hidden');
}

/**
 * Display city suggestions in dropdown
 */
function displaySuggestions(data) {
    if (data.length === 0) {
        autocompleteDropdown.innerHTML = '<div class=\"autocomplete-loading\">Aucune ville trouvée</div>';
        return;
    }
    
    autocompleteDropdown.innerHTML = '';
    selectedIndex = -1;
    
    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.dataset.index = index;
        
        // Format display name (City, Country)
        const parts = item.display_name.split(',');
        const cityName = parts[0];
        const country = parts[parts.length - 1].trim();
        
        div.textContent = `${cityName}, ${country}`;
        
        // Click handler
        div.addEventListener('click', () => {
            selectSuggestion(item);
        });
        
        autocompleteDropdown.appendChild(div);
    });
    
    autocompleteDropdown.classList.remove('hidden');
}

/**
 * Select a suggestion from dropdown
 */
function selectSuggestion(item) {
    const parts = item.display_name.split(',');
    const cityName = parts[0];
    
    cityInput.value = cityName;
    hideAutocomplete();
    
    // Trigger search
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    getWeatherData(lat, lon, cityName);
}

/**
 * Handle keyboard navigation in autocomplete
 */
function handleKeyboardNavigation(e) {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    
    if (items.length === 0) return;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            selectSuggestion(suggestions[selectedIndex]);
        } else {
            searchByCity();
        }
    } else if (e.key === 'Escape') {
        hideAutocomplete();
    }
}

/**
 * Update visual selection in autocomplete
 */
function updateSelection(items) {
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Hide autocomplete dropdown
 */
function hideAutocomplete() {
    autocompleteDropdown.classList.add('hidden');
    autocompleteDropdown.innerHTML = '';
    selectedIndex = -1;
    suggestions = [];
}

// ====================
// SEARCH FUNCTIONS
// ====================

/**
 * Search weather by city name
 */
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
        // Geocode city name to coordinates
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&accept-language=fr`,
            {
                headers: {
                    'User-Agent': 'WeatherAggregator/1.0'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Geocoding API error');
        }
        
        const data = await response.json();
        
        if (data.length === 0) {
            hideLoading();
            showError('Ville non trouvée. Vérifiez l\'orthographe.');
            return;
        }
        
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const cityName = data[0].display_name.split(',')[0];
        
        await getWeatherData(lat, lon, cityName);
        
    } catch (error) {
        hideLoading();
        showError('Erreur lors de la recherche. Réessayez.');
        console.error('[GEOCODING ERROR]', error);
    }
}

/**
 * Search weather by coordinates
 */
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
    
    getWeatherData(lat, lon);
}

// ====================
// WEATHER DATA
// ====================

/**
 * Fetch weather data from API
 */
async function getWeatherData(lat, lon, cityName = null) {
    showLoading();
    hideError();
    hideResults();
    
    // Reset forecast data
    currentForecastData = null;
    const forecastContent = document.getElementById('forecastContent');
    const toggleBtn = document.getElementById('toggleForecast');
    if (forecastContent && !forecastContent.classList.contains('hidden')) {
        forecastContent.classList.add('hidden');
        toggleBtn.textContent = '[ SHOW ]';
    }
    
    try {
        console.log(`[API REQUEST] Fetching weather for ${lat}, ${lon}`);
        
        const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erreur serveur');
        }
        
        // Save to history
        saveToHistory({
            lat,
            lon,
            name: cityName || `${lat}, ${lon}`
        });
        
        displayResults(data, cityName);
        
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

/**
 * Display weather data in UI
 */
function displayResults(data, cityName) {
    // Location info
    document.getElementById('locationName').textContent = cityName || `${data.location.lat}, ${data.location.lon}`;
    document.getElementById('coordinates').textContent = `LAT: ${data.location.lat} | LON: ${data.location.lon}`;
    document.getElementById('timestamp').textContent = new Date(data.timestamp).toLocaleString('fr-FR');
    
    // Weather data
    document.getElementById('temperature').textContent = `${data.weather.temperature}°C`;
    document.getElementById('conditions').textContent = data.weather.conditions.toUpperCase();
    document.getElementById('humidity').textContent = `${data.weather.humidity}%`;
    document.getElementById('wind').textContent = `${data.weather.wind_speed} km/h`;
    document.getElementById('precipitation').textContent = `${data.weather.precipitation} mm`;
    
    // Weather icon
    const weatherIcon = getWeatherIconTerminal(data.weather.weather_code);
    document.getElementById('weatherIcon').innerHTML = weatherIcon;
    
    // UV Index
    const uvIndexValue = data.uv.uv_index !== null ? data.uv.uv_index : 'N/A';
    const uvIndexDisplay = uvIndexValue === 0 ? '0 (Nuit)' : uvIndexValue;
    document.getElementById('uvIndex').textContent = uvIndexDisplay;
    const uvRisk = document.getElementById('uvRisk');
    uvRisk.textContent = data.uv.risk_level.toUpperCase();
    uvRisk.style.color = getUVColor(data.uv.risk_level);
    
    // Air Quality
    document.getElementById('aqi').textContent = data.air_quality.aqi !== null ? data.air_quality.aqi : 'N/A';
    document.getElementById('pm25').textContent = data.air_quality.pm2_5 ? `${data.air_quality.pm2_5} µg/m³` : 'N/A';
    document.getElementById('pm10').textContent = data.air_quality.pm10 ? `${data.air_quality.pm10} µg/m³` : 'N/A';
    
    const airQuality = document.getElementById('airQuality');
    airQuality.textContent = data.air_quality.quality.toUpperCase();
    airQuality.style.color = getAQIColor(data.air_quality.quality);
    
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
 * Get terminal-style weather icon based on weather code
 */
function getWeatherIconTerminal(weatherCode) {
    const iconMap = {
        0: { icon: '☀', color: '#FFFF00' }, // Clear sky
        1: { icon: '🌤', color: '#FFFF00' }, // Mainly clear
        2: { icon: '⛅', color: '#00FFFF' }, // Partly cloudy
        3: { icon: '☁', color: '#666' },     // Overcast
        45: { icon: '🌫', color: '#666' },   // Foggy
        48: { icon: '🌫', color: '#666' },   // Rime fog
        51: { icon: '🌧', color: '#00FFFF' }, // Drizzle
        61: { icon: '🌧', color: '#00FFFF' }, // Rain
        63: { icon: '🌧', color: '#00FFFF' },
        65: { icon: '🌧', color: '#00FFFF' },
        71: { icon: '❄', color: '#00FFFF' }, // Snow
        73: { icon: '❄', color: '#00FFFF' },
        75: { icon: '❄', color: '#00FFFF' },
        80: { icon: '🌧', color: '#00FFFF' }, // Rain showers
        81: { icon: '🌧', color: '#00FFFF' },
        82: { icon: '🌧', color: '#00FFFF' },
        95: { icon: '⚡', color: '#FFFF00' }, // Thunderstorm
        96: { icon: '⚡', color: '#FFFF00' },
        99: { icon: '⚡', color: '#FFFF00' }
    };
    
    const config = iconMap[weatherCode] || { icon: '☁', color: '#00FFFF' };
    
    return `<div style="font-size: 60px; color: ${config.color};">${config.icon}</div>`;
}

/**
 * Get color for UV risk level
 */
function getUVColor(level) {
    const colors = {
        'Low': '#00FF41',
        'Moderate': '#FFFF00',
        'High': '#FF8800',
        'Very High': '#FF0000',
        'Extreme': '#FF00FF',
        'Unknown': '#666666'
    };
    return colors[level] || '#666666';
}

/**
 * Get color for air quality level
 */
function getAQIColor(quality) {
    if (quality.includes('Good')) return '#00FF41';
    if (quality.includes('Moderate')) return '#FFFF00';
    if (quality.includes('Unhealthy')) return '#FF0000';
    if (quality.includes('Hazardous')) return '#FF00FF';
    return '#666666';
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
// INITIALIZATION
// ====================

// Global variables for forecast
let forecastChart = null;
let currentForecastData = null;

/**
 * Load default location on startup
 */
window.addEventListener('load', () => {
    console.log('[INIT] Weather Aggregator started');
    
    // Setup forecast toggle button
    setupForecastToggle();
    
    // Try to load last location from history
    const history = getHistory();
    
    if (history.length > 0) {
        const lastLocation = history[0];
        console.log('[INIT] Loading last searched location:', lastLocation.name);
        getWeatherData(lastLocation.lat, lastLocation.lon, lastLocation.name);
    } else {
        // Default to Aix-en-Provence
        console.log('[INIT] Loading default location: Aix-en-Provence');
        getWeatherData(43.5297, 5.4474, 'Aix-en-Provence');
    }
});

// ====================
// 7-DAY FORECAST
// ====================

/**
 * Setup forecast toggle button
 */
function setupForecastToggle() {
    const toggleBtn = document.getElementById('toggleForecast');
    const forecastContent = document.getElementById('forecastContent');
    
    if (!toggleBtn || !forecastContent) return;
    
    toggleBtn.addEventListener('click', () => {
        const isHidden = forecastContent.classList.contains('hidden');
        
        if (isHidden) {
            // Show forecast
            forecastContent.classList.remove('hidden');
            toggleBtn.textContent = '[ HIDE ]';
            
            // Load forecast if not already loaded
            if (!currentForecastData) {
                const results = document.getElementById('results');
                if (!results.classList.contains('hidden')) {
                    // Get current location from results
                    const locationText = document.getElementById('coordinates').textContent;
                    const match = locationText.match(/LAT: ([\d.-]+) \| LON: ([\d.-]+)/);
                    if (match) {
                        const lat = parseFloat(match[1]);
                        const lon = parseFloat(match[2]);
                        loadForecast(lat, lon);
                    }
                }
            }
        } else {
            // Hide forecast
            forecastContent.classList.add('hidden');
            toggleBtn.textContent = '[ SHOW ]';
        }
    });
}

/**
 * Load 7-day forecast data
 */
async function loadForecast(lat, lon) {
    const loadingDiv = document.getElementById('forecastLoading');
    const chartContainer = document.querySelector('.forecast-chart-container');
    const daysContainer = document.getElementById('forecastDays');
    
    try {
        // Show loading
        loadingDiv.classList.remove('hidden');
        chartContainer.style.display = 'none';
        daysContainer.innerHTML = '';
        
        console.log(`[FORECAST] Fetching 7-day forecast for ${lat}, ${lon}`);
        
        const response = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch forecast');
        }
        
        currentForecastData = data;
        
        // Hide loading
        loadingDiv.classList.add('hidden');
        chartContainer.style.display = 'block';
        
        // Display forecast
        displayForecastChart(data.forecast);
        displayForecastDays(data.forecast);
        
        console.log('[FORECAST] Forecast data displayed');
        
    } catch (error) {
        console.error('[FORECAST ERROR]', error);
        loadingDiv.classList.add('hidden');
        daysContainer.innerHTML = '<div style="color: #FF0000; text-align: center; padding: 20px;">Failed to load forecast data</div>';
    }
}

/**
 * Display forecast chart using Chart.js
 */
function displayForecastChart(forecast) {
    const canvas = document.getElementById('forecastChart');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if any
    if (forecastChart) {
        forecastChart.destroy();
    }
    
    // Prepare data
    const labels = forecast.days.map(day => {
        const date = new Date(day.date);
        return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    });
    
    const maxTemps = forecast.days.map(day => day.temp_max);
    const minTemps = forecast.days.map(day => day.temp_min);
    
    // Create chart
    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Max Temperature',
                    data: maxTemps,
                    borderColor: '#FF8800',
                    backgroundColor: 'rgba(255, 136, 0, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Min Temperature',
                    data: minTemps,
                    borderColor: '#00FFFF',
                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: {
                legend: {
                    labels: {
                        color: '#00FF41',
                        font: {
                            family: 'JetBrains Mono',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: '#000000',
                    titleColor: '#00FFFF',
                    bodyColor: '#00FF41',
                    borderColor: '#00FF41',
                    borderWidth: 1,
                    titleFont: {
                        family: 'JetBrains Mono'
                    },
                    bodyFont: {
                        family: 'JetBrains Mono'
                    },
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y + '°C';
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#00FF41',
                        font: {
                            family: 'JetBrains Mono',
                            size: 11
                        },
                        callback: function(value) {
                            return value + '°C';
                        }
                    },
                    grid: {
                        color: '#1A1A1A'
                    }
                },
                x: {
                    ticks: {
                        color: '#00FF41',
                        font: {
                            family: 'JetBrains Mono',
                            size: 11
                        }
                    },
                    grid: {
                        color: '#1A1A1A'
                    }
                }
            }
        }
    });
}

/**
 * Display forecast days cards
 */
function displayForecastDays(forecast) {
    const container = document.getElementById('forecastDays');
    container.innerHTML = '';
    
    forecast.days.forEach((day, index) => {
        const date = new Date(day.date);
        const dayName = index === 0 ? 'Aujourd\'hui' : date.toLocaleDateString('fr-FR', { weekday: 'long' });
        const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        
        const dayCard = document.createElement('div');
        dayCard.className = 'forecast-day';
        
        // Get weather icon
        const icon = getWeatherIcon(day.weather_code);
        
        dayCard.innerHTML = `
            <div class="forecast-day-date">${dayName}<br>${dateStr}</div>
            <div class="forecast-day-icon">${icon}</div>
            <div class="forecast-day-temps">
                <span class="forecast-day-temp-max">${Math.round(day.temp_max)}°</span>
                <span style="color: #666;"> / </span>
                <span class="forecast-day-temp-min">${Math.round(day.temp_min)}°</span>
            </div>
            <div class="forecast-day-condition">${day.conditions}</div>
        `;
        
        container.appendChild(dayCard);
    });
}

/**
 * Get weather icon emoji for forecast
 */
function getWeatherIcon(weatherCode) {
    const iconMap = {
        0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
        45: '🌫️', 48: '🌫️',
        51: '🌧️', 53: '🌧️', 55: '🌧️',
        61: '🌧️', 63: '🌧️', 65: '🌧️',
        66: '🌧️', 67: '🌧️',
        71: '❄️', 73: '❄️', 75: '❄️', 77: '❄️',
        80: '🌧️', 81: '🌧️', 82: '🌧️',
        85: '❄️', 86: '❄️',
        95: '⚡', 96: '⚡', 99: '⚡'
    };
    
    return iconMap[weatherCode] || '☁️';
}

// ====================
// DATA EXPORT
// ====================

/**
 * Export current weather data as JSON
 */
function exportDataJSON() {
    const results = document.getElementById('results');
    if (results.classList.contains('hidden')) {
        alert('Aucune donnée à exporter. Effectuez d\'abord une recherche.');
        return;
    }
    
    // Gather all displayed data
    const data = {
        location: {
            name: document.getElementById('locationName').textContent,
            coordinates: document.getElementById('coordinates').textContent
        },
        timestamp: document.getElementById('timestamp').textContent,
        weather: {
            temperature: document.getElementById('temperature').textContent,
            conditions: document.getElementById('conditions').textContent,
            humidity: document.getElementById('humidity').textContent,
            wind: document.getElementById('wind').textContent,
            precipitation: document.getElementById('precipitation').textContent
        },
        uv: {
            index: document.getElementById('uvIndex').textContent,
            risk: document.getElementById('uvRisk').textContent
        },
        air_quality: {
            aqi: document.getElementById('aqi').textContent,
            pm25: document.getElementById('pm25').textContent,
            pm10: document.getElementById('pm10').textContent,
            quality: document.getElementById('airQuality').textContent
        },
        recommendations: Array.from(document.getElementById('recommendationsList').children).map(li => li.textContent),
        forecast: currentForecastData ? currentForecastData.forecast : null
    };
    
    // Create and download JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weather-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[EXPORT] Data exported as JSON');
}

/**
 * Export current weather data as CSV
 */
function exportDataCSV() {
    const results = document.getElementById('results');
    if (results.classList.contains('hidden')) {
        alert('Aucune donnée à exporter. Effectuez d\'abord une recherche.');
        return;
    }
    
    // CSV header
    let csv = 'Location,Coordinates,Timestamp,Temperature,Conditions,Humidity,Wind,Precipitation,UV Index,UV Risk,AQI,PM2.5,PM10,Air Quality\n';
    
    // CSV data
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
    
    // Create and download CSV file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weather-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[EXPORT] Data exported as CSV');
}

// ====================
// EXPOSE FUNCTIONS
// ====================
// This allows calling functions from HTML onclick attributes
window.getUserLocation = getUserLocation;
window.exportDataJSON = exportDataJSON;
window.exportDataCSV = exportDataCSV;

console.log('[SCRIPT LOADED] Weather Aggregator ready');
console.log('Available commands: getUserLocation(), exportDataJSON(), exportDataCSV()');
