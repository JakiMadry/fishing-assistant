const router = require('express').Router();
const { getWaterBodiesNearby, searchWaterByName } = require('../services/overpass');
const { enrichFishingSpot } = require('../services/claude');
const { spotsDb } = require('../services/db');

/**
 * GET /api/spots/nearby?lat=52.23&lon=21.01&radius=15000
 * Pobiera wszystkie zbiorniki wodne z OSM w pobliżu + user spots
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lon, radius = 15000 } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Wymagane: lat, lon' });

    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);

    const [osmSpots, userSpots] = await Promise.all([
      getWaterBodiesNearby(latN, lonN, parseInt(radius)),
      Promise.resolve(spotsDb.getNearby(latN, lonN, parseInt(radius) / 1000))
    ]);

    res.json({
      osm: osmSpots,
      userAdded: userSpots.map(s => ({ ...s, source: 'community' })),
      total: osmSpots.length + userSpots.length
    });
  } catch (err) {
    console.error('spots/nearby error:', err.message);
    res.status(500).json({ error: 'Błąd pobierania łowisk', detail: err.message });
  }
});

/**
 * GET /api/spots/search?q=Śniardwy
 * Wyszukuje łowisko po nazwie przez Nominatim (OSM)
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Wymagany parametr: q' });

    const results = await searchWaterByName(q);
    res.json({ results });
  } catch (err) {
    console.error('spots/search error:', err.message);
    res.status(500).json({ error: 'Błąd wyszukiwania', detail: err.message });
  }
});

/**
 * GET /api/spots/enrich?name=Wisła&type=rzeka&lat=52.23&lon=21.01
 * AI opisuje konkretne łowisko (Claude)
 */
router.get('/enrich', async (req, res) => {
  try {
    const { name, type, lat, lon } = req.query;
    if (!name) return res.status(400).json({ error: 'Wymagany parametr: name' });

    const enriched = await enrichFishingSpot(
      name, type || 'zbiornik wodny',
      parseFloat(lat) || null, parseFloat(lon) || null
    );

    res.json({ name, enriched });
  } catch (err) {
    console.error('spots/enrich error:', err.message);
    res.status(500).json({ error: 'Błąd AI enrichment', detail: err.message });
  }
});

/**
 * GET /api/spots/user
 * Pobiera wszystkie user-added spots (publiczne)
 */
router.get('/user', (req, res) => {
  try {
    const spots = spotsDb.getAll();
    res.json({ spots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/spots/user
 * Dodaje nowe łowisko od użytkownika
 */
router.post('/user', (req, res) => {
  try {
    const { name, lat, lng, type, description, species, techniques, difficulty, isPublic } = req.body;

    if (!name || !lat || !lng) {
      return res.status(400).json({ error: 'Wymagane: name, lat, lng' });
    }

    const spot = spotsDb.create({ name, lat, lng, type, description, species, techniques, difficulty, isPublic });
    res.status(201).json({ spot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/spots/user/:id/catch
 * Dodaje zapis połowu do łowiska
 */
router.post('/user/:id/catch', (req, res) => {
  try {
    const { id } = req.params;
    const catchData = req.body;

    if (!catchData.species) {
      return res.status(400).json({ error: 'Wymagane: species' });
    }

    spotsDb.addCatch(parseInt(id), catchData);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/spots/user/:id/catches
 * Historia połowów z danego łowiska
 */
router.get('/user/:id/catches', (req, res) => {
  try {
    const catches = spotsDb.getCatches(parseInt(req.params.id));
    res.json({ catches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
