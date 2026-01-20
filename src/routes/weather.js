const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

// GET /api/weather?lat=43.5&lon=5.4
router.get('/weather', weatherController.getWeather.bind(weatherController));

// GET /api/forecast?lat=43.5&lon=5.4
router.get('/forecast', weatherController.getForecast.bind(weatherController));

module.exports = router;
