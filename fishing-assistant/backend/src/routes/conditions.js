const router = require('express').Router();
const { getCurrentWeather } = require('../services/weather');
const { getMoonData } = require('../services/moonPhase');
const { calculateFishingScore } = require('../services/fishingScore');

/**
 * GET /api/conditions?lat=52.23&lon=21.01&species=sandacz
 * Zwraca pełne warunki wędkarskie dla lokalizacji
 */
router.get('/', async (req, res) => {
  try {
    const { lat, lon, species } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Wymagane parametry: lat, lon' });
    }

    const [weather, moonData] = await Promise.all([
      getCurrentWeather(parseFloat(lat), parseFloat(lon)),
      getMoonData(parseFloat(lat), parseFloat(lon))
    ]);

    const fishing = calculateFishingScore(weather, moonData, species || null);

    res.json({
      location: { lat: parseFloat(lat), lon: parseFloat(lon) },
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
 * Zwraca listę obsługiwanych gatunków
 */
router.get('/species', (req, res) => {
  const { SPECIES_PROFILES } = require('../services/fishingScore');
  res.json({ species: Object.keys(SPECIES_PROFILES) });
});

module.exports = router;
