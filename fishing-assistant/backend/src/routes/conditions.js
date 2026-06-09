const router = require('express').Router();
const { getCurrentWeather, getFullForecast } = require('../services/weather');
const { getMoonData } = require('../services/moonPhase');
const { calculateFishingScore } = require('../services/fishingScore');

/**
 * GET /api/conditions?lat=52.23&lon=21.01
 * Zwraca warunki na DZIŚ — szybko.
 */
router.get('/', async (req, res) => {
  try {
    const { lat, lon, species } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Wymagane parametry: lat, lon' });

    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);

    const [weather, moonData] = await Promise.all([
      getCurrentWeather(latN, lonN),
      Promise.resolve(getMoonData(latN, lonN)),
    ]);

    const fishing = calculateFishingScore(weather, moonData, species || null);

    res.json({ weather, moon: moonData, fishing, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('conditions error:', err.message);
    res.status(500).json({ error: 'Błąd pobierania warunków', detail: err.message });
  }
});

/**
 * GET /api/conditions/forecast?lat=52.23&lon=21.01
 * Zwraca prognozę na dni 1-4 — ładowane w tle.
 */
router.get('/forecast', async (req, res) => {
  try {
    const { lat, lon, species } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Wymagane parametry: lat, lon' });

    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    const forecastByDay = await getFullForecast(latN, lonN);

    const days = [];
    for (let i = 1; i <= 4; i++) {
      const dayWeather = forecastByDay[i];
      if (!dayWeather) continue;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i);
      const moonData = getMoonData(latN, lonN, targetDate);
      const fishing = calculateFishingScore(dayWeather, moonData, species || null);
      days.push({
        day: i,
        date: targetDate.toISOString().slice(0, 10),
        weather: dayWeather,
        moon: moonData,
        fishing,
      });
    }

    res.json({ forecast: days });
  } catch (err) {
    console.error('conditions/forecast error:', err.message);
    res.status(500).json({ error: 'Błąd prognozy', detail: err.message });
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
