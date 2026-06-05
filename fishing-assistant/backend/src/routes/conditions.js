const router = require('express').Router();
const { getCurrentWeather, getForecastForDay } = require('../services/weather');
const { getMoonData } = require('../services/moonPhase');
const { calculateFishingScore } = require('../services/fishingScore');

/**
 * GET /api/conditions?lat=52.23&lon=21.01&species=sandacz&day=0
 * day: 0=dziś (default), 1=jutro, 2=pojutrze, 3-4 dalsze dni
 */
router.get('/', async (req, res) => {
  try {
    const { lat, lon, species, day = 0 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Wymagane parametry: lat, lon' });
    }

    const dayOffset = Math.min(Math.max(parseInt(day) || 0, 0), 4);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);

    const [weather, moonData] = await Promise.all([
      dayOffset === 0
        ? getCurrentWeather(parseFloat(lat), parseFloat(lon))
        : getForecastForDay(parseFloat(lat), parseFloat(lon), dayOffset),
      getMoonData(parseFloat(lat), parseFloat(lon), targetDate)
    ]);

    const fishing = calculateFishingScore(weather, moonData, species || null);

    res.json({
      location: { lat: parseFloat(lat), lon: parseFloat(lon) },
      day: dayOffset,
      date: targetDate.toISOString().slice(0, 10),
      weather,
      moon: moonData,
      fishing,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('conditions error:', err.message);
    res.status(500).json({ error: 'Błąd pobierania warunków', detail: err.message });
  }
});

/**
 * GET /api/conditions/species
 */
router.get('/species', (req, res) => {
  const { SPECIES_PROFILES } = require('../services/fishingScore');
  res.json({ species: Object.keys(SPECIES_PROFILES) });
});

module.exports = router;
