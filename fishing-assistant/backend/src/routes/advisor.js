const router = require('express').Router();
const { getBaitAdvice, generatePushNotification } = require('../services/claude');
const { getCurrentWeather } = require('../services/weather');
const { getMoonData } = require('../services/moonPhase');
const { calculateFishingScore } = require('../services/fishingScore');
const { tokensDb } = require('../services/db');

/**
 * POST /api/advisor/bait
 * AI doradca przynęt
 * Body: { query: "Wisła, sandacz, listopad", lat?, lon? }
 */
router.post('/bait', async (req, res) => {
  try {
    const { query, lat, lon } = req.body;

    if (!query || query.trim().length < 3) {
      return res.status(400).json({ error: 'Podaj zapytanie (np. "Wisła, sandacz, listopad")' });
    }

    // Opcjonalnie dołącz aktualne warunki jeśli mamy lokalizację
    let conditions = null;
    if (lat && lon) {
      try {
        conditions = await getCurrentWeather(parseFloat(lat), parseFloat(lon));
      } catch {
        // warunki opcjonalne, nie przerywaj
      }
    }

    const advice = await getBaitAdvice(query, conditions);
    res.json({ query, advice, conditions });
  } catch (err) {
    console.error('advisor/bait error:', err.message);
    res.status(500).json({ error: 'Błąd AI doradcy', detail: err.message });
  }
});

/**
 * POST /api/advisor/check-conditions
 * Sprawdza warunki i opcjonalnie generuje push notification
 * Body: { lat, lon, pushToken? }
 */
router.post('/check-conditions', async (req, res) => {
  try {
    const { lat, lon, pushToken } = req.body;

    if (!lat || !lon) return res.status(400).json({ error: 'Wymagane: lat, lon' });

    const [weather, moonData] = await Promise.all([
      getCurrentWeather(parseFloat(lat), parseFloat(lon)),
      getMoonData(parseFloat(lat), parseFloat(lon))
    ]);

    const fishing = calculateFishingScore(weather, moonData);
    const topScore = fishing.topSpecies[0].overall;
    const topSpecies = fishing.topSpecies[0].species;

    let notification = null;
    if (topScore >= 75) {
      notification = await generatePushNotification(topSpecies, topScore, weather);
    }

    res.json({
      score: topScore,
      topSpecies,
      notification,
      shouldNotify: topScore >= 75
    });
  } catch (err) {
    console.error('advisor/check-conditions error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/advisor/register-push
 * Rejestruje token push notifications
 */
router.post('/register-push', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Wymagany: token' });
    tokensDb.save(token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
