const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Pobiera zbiorniki wodne i rzeki w promieniu `radius` metrów od podanych współrzędnych.
 * Używa OSM Overpass API – zawiera WSZYSTKIE wody w Polsce i na świecie.
 */
async function getWaterBodiesNearby(lat, lon, radiusMeters = 15000) {
  const r = Math.min(radiusMeters, 20000);
  const query = `[out:json][timeout:20];(way["natural"="water"](around:${r},${lat},${lon});way["waterway"~"river|stream|canal"](around:${r},${lat},${lon});way["leisure"="fishing"](around:${r},${lat},${lon});node["leisure"="fishing"](around:${r},${lat},${lon}););out center tags;`;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'FishingAssistant/1.0 (https://jakbierze.pl)',
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    throw new Error(`Overpass HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  }

  const data = await res.json();
  return parseOverpassResults(data.elements || [], lat, lon);
}

/**
 * Wyszukuje łowisko po nazwie przez Nominatim (OSM geocoding).
 */
async function searchWaterByName(name) {
  const params = new URLSearchParams({ q: name, format: 'json', limit: '5', addressdetails: '1', extratags: '1' });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'FishingAssistant/1.0 (https://jakbierze.pl)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return [];
  const results = await res.json();

  return results
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
    .slice(0, 50);
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
