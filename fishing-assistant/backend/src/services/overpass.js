const axios = require('axios');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Pobiera zbiorniki wodne i rzeki w promieniu `radius` metrów od podanych współrzędnych.
 * Używa OSM Overpass API – zawiera WSZYSTKIE wody w Polsce i na świecie.
 */
async function getWaterBodiesNearby(lat, lon, radiusMeters = 15000) {
  const query = `
    [out:json][timeout:25];
    (
      way["natural"="water"](around:${radiusMeters},${lat},${lon});
      relation["natural"="water"](around:${radiusMeters},${lat},${lon});
      way["waterway"~"river|stream|canal"](around:${radiusMeters},${lat},${lon});
      relation["waterway"~"river|stream"](around:${radiusMeters},${lat},${lon});
      way["leisure"="fishing"](around:${radiusMeters},${lat},${lon});
      node["leisure"="fishing"](around:${radiusMeters},${lat},${lon});
    );
    out center tags;
  `;

  const response = await axios.post(OVERPASS_URL, query, {
    headers: {
      'Content-Type': 'text/plain',
      'User-Agent': 'FishingAssistant/1.0 (https://jakbierze.pl)',
    },
    timeout: 30000
  });

  return parseOverpassResults(response.data.elements, lat, lon);
}

/**
 * Wyszukuje łowisko po nazwie przez Nominatim (OSM geocoding).
 */
async function searchWaterByName(name) {
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: {
      q: name,
      format: 'json',
      limit: 5,
      addressdetails: 1,
      extratags: 1
    },
    headers: { 'User-Agent': 'FishingAssistant/1.0' },
    timeout: 10000
  });

  return response.data
    .filter(r => ['water', 'waterway', 'natural', 'leisure'].includes(r.class) ||
                 ['lake', 'river', 'reservoir', 'pond', 'stream'].includes(r.type))
    .map(r => ({
      osmId: r.osm_id,
      osmType: r.osm_type,
      name: r.display_name.split(',')[0],
      fullName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      type: mapOsmTypeToFishing(r.type, r.class),
      boundingBox: r.boundingbox
    }));
}

function parseOverpassResults(elements, userLat, userLon) {
  const seen = new Set();
  return elements
    .filter(el => {
      const name = el.tags?.name;
      if (!name || seen.has(name)) return false;
      // Filter out technical/coded names like ZB-05, ROW-3, etc.
      if (/^[A-Z]{1,4}[-_]\d+/.test(name)) return false;
      if (name.length < 3) return false;
      seen.add(name);
      return true;
    })
    .map(el => {
      const lat = el.center?.lat || el.lat;
      const lng = el.center?.lon || el.lon;
      const dist = lat && lng ? haversineKm(userLat, userLon, lat, lng) : null;
      const tags = el.tags || {};

      return {
        osmId: el.id,
        osmType: el.type,
        name: tags.name || tags['name:pl'] || 'Nieznane łowisko',
        lat,
        lng,
        distanceKm: dist ? Math.round(dist * 10) / 10 : null,
        type: mapOsmTypeToFishing(tags.waterway, tags.natural || tags.leisure),
        area: tags['natural:water'] || tags.water,
        tags: {
          fishing: tags.fishing,
          access: tags.access,
          maxdepth: tags.maxdepth,
          surface: tags.surface
        }
      };
    })
    .filter(s => s.lat && s.lng)
    .sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999))
    .slice(0, 50); // max 50 wyników
}

function mapOsmTypeToFishing(waterway, natural) {
  if (waterway === 'river') return 'rzeka';
  if (waterway === 'stream') return 'strumień';
  if (waterway === 'canal') return 'kanał';
  if (natural === 'lake' || natural === 'water') return 'jezioro';
  if (natural === 'reservoir') return 'zbiornik';
  if (natural === 'pond') return 'staw';
  if (natural === 'fishing') return 'łowisko komercyjne';
  return 'zbiornik wodny';
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { getWaterBodiesNearby, searchWaterByName };
