const express = require('express');
const { query, validationResult } = require('express-validator');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

const validateWeatherParams = [
    query('lat')
        .exists()
        .withMessage('lat is required')
        .isFloat({ min: -90, max: 90 })
        .withMessage('lat must be between -90 and 90'),
    query('lon')
        .exists()
        .withMessage('lon is required')
        .isFloat({ min: -180, max: 180 })
        .withMessage('lon must be between -180 and 180'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                errors: errors.array(),
            });
        }
        next();
    },
];

// GET /api/weather?lat=43.5&lon=5.4
router.get('/weather', validateWeatherParams, weatherController.getWeather.bind(weatherController));

// GET /api/forecast?lat=43.5&lon=5.4
router.get(
    '/forecast',
    validateWeatherParams,
    weatherController.getForecast.bind(weatherController)
);

module.exports = router;
