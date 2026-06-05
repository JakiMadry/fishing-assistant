"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api, { ENDPOINTS } from "@/lib/api";
import { getUserLocation } from "@/lib/utils";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function coloredIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function getMarkerColor(type: string): string {
  if (type.includes("rzeka") || type.includes("strumień") || type.includes("strumien") || type.includes("kanał") || type.includes("kanal")) return "#38bdf8";
  if (type.includes("jezioro")) return "#a78bfa";
  if (type.includes("zbiornik")) return "#3b72f2";
  if (type.includes("łowisko") || type.includes("lowisko")) return "#f0a030";
  if (type.includes("staw")) return "#67e8f9";
  return "#9ca3b0";
}

// ---- Direct OSM calls from browser (bypasses Render rate limits) ----

function mapOsmType(waterway?: string, natural?: string): string {
  if (waterway === "river") return "rzeka";
  if (waterway === "stream") return "strumień";
  if (waterway === "canal") return "kanał";
  if (natural === "lake" || natural === "water") return "jezioro";
  if (natural === "reservoir") return "zbiornik";
  if (natural === "pond") return "staw";
  if (natural === "fishing") return "łowisko komercyjne";
  return "zbiornik wodny";
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchOverpassSpots(lat: number, lon: number, radius: number): Promise<OsmSpot[]> {
  const r = Math.min(radius, 20000);
  const query = `[out:json][timeout:20];(way["natural"="water"](around:${r},${lat},${lon});way["waterway"~"river|stream|canal"](around:${r},${lat},${lon});way["leisure"="fishing"](around:${r},${lat},${lon});node["leisure"="fishing"](around:${r},${lat},${lon}););out center tags;`;

  const urls = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) continue;
      const data = await res.json();
      const elements = data.elements || [];

      const seen = new Set<string>();
      return elements
        .filter((el: any) => {
          const name = el.tags?.name;
          if (!name || seen.has(name)) return false;
          if (/^[A-Z]{1,4}[-_]\d+/.test(name)) return false;
          if (name.length < 3) return false;
          seen.add(name);
          return true;
        })
        .map((el: any) => {
          const elLat = el.center?.lat || el.lat;
          const elLng = el.center?.lon || el.lon;
          const tags = el.tags || {};
          return {
            osmId: el.id,
            name: tags.name || "Nieznane",
            lat: elLat,
            lng: elLng,
            type: mapOsmType(tags.waterway, tags.natural || tags.leisure),
            distanceKm: elLat && elLng ? Math.round(haversineKm(lat, lon, elLat, elLng) * 10) / 10 : null,
          };
        })
        .filter((s: OsmSpot) => s.lat && s.lng)
        .sort((a: OsmSpot, b: OsmSpot) => (a.distanceKm || 999) - (b.distanceKm || 999))
        .slice(0, 50);
    } catch {
      continue;
    }
  }
  return [];
}

async function searchNominatim(q: string): Promise<{ name: string; fullName: string; lat: number; lng: number; type: string }[]> {
  const params = new URLSearchParams({ q, format: "json", limit: "5", addressdetails: "1" });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "FishingAssistant/1.0" },
    });
    if (!res.ok) return [];
    const results = await res.json();
    return results
      .filter((r: any) =>
        ["water", "waterway", "natural", "leisure"].includes(r.class) ||
        ["lake", "river", "reservoir", "pond", "stream"].includes(r.type)
      )
      .map((r: any) => ({
        name: r.display_name.split(",")[0],
        fullName: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        type: mapOsmType(r.type, r.class),
      }));
  } catch {
    return [];
  }
}

// ---- Components ----

interface OsmSpot {
  osmId: number;
  name: string;
  lat: number;
  lng: number;
  type: string;
  distanceKm: number | null;
}

interface EnrichedSpot {
  species: string[];
  bestSeasons: string[];
  techniques: string[];
  difficulty: string;
  description: string;
  tip: string;
}

interface SelectedSpotData extends OsmSpot {
  enriched?: EnrichedSpot | null;
  loading?: boolean;
}

function MapEvents({ onMoveEnd }: { onMoveEnd: (center: L.LatLng) => void }) {
  useMapEvents({
    moveend: (e) => onMoveEnd(e.target.getCenter()),
  });
  return null;
}

function FlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13, { duration: 0.8 });
  }, [center, map]);
  return null;
}

export default function MapView() {
  const [osmSpots, setOsmSpots] = useState<OsmSpot[]>([]);
  const [userSpots, setUserSpots] = useState<any[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<SelectedSpotData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [center] = useState<[number, number]>([52.23, 21.01]);
  const [spotsCount, setSpotsCount] = useState(0);
  const [osmLoading, setOsmLoading] = useState(false);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNearbySpots = useCallback(async (lat: number, lon: number) => {
    setOsmLoading(true);
    try {
      const spots = await fetchOverpassSpots(lat, lon, 15000);
      setOsmSpots(spots);
      setSpotsCount(spots.length);
    } catch {
      // silent
    } finally {
      setOsmLoading(false);
    }
  }, []);

  const loadUserSpots = useCallback(async () => {
    try {
      const res = await api.get(ENDPOINTS.spotsUser);
      setUserSpots(res.data.spots || []);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      const loc = await getUserLocation();
      if (loc) {
        setFlyTarget([loc.lat, loc.lon]);
        loadNearbySpots(loc.lat, loc.lon);
      } else {
        loadNearbySpots(52.23, 21.01);
      }
      loadUserSpots();
    })();
  }, [loadNearbySpots, loadUserSpots]);

  function handleMoveEnd(c: L.LatLng) {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    loadTimerRef.current = setTimeout(() => loadNearbySpots(c.lat, c.lng), 1200);
  }

  async function handleMarkerClick(spot: OsmSpot) {
    setSelectedSpot({ ...spot, loading: true });
    try {
      const res = await api.get(ENDPOINTS.spotsEnrich, {
        params: { name: spot.name, type: spot.type, lat: spot.lat, lon: spot.lng },
      });
      setSelectedSpot((p) => (p ? { ...p, enriched: res.data.enriched, loading: false } : null));
    } catch {
      setSelectedSpot((p) => (p ? { ...p, enriched: null, loading: false } : null));
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const results = await searchNominatim(searchQuery);
      if (results.length > 0) {
        const first = results[0];
        setFlyTarget([first.lat, first.lng]);
        loadNearbySpots(first.lat, first.lng);
      }
    } catch {}
    setSearchLoading(false);
  }

  const LEGEND = [
    { color: "#38bdf8", label: "Rzeka / strumien" },
    { color: "#a78bfa", label: "Jezioro" },
    { color: "#3b72f2", label: "Zbiornik" },
    { color: "#f0a030", label: "Dodane" },
  ];

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Search bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2 max-w-xl mx-auto">
        <div className="flex-1 relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Szukaj jeziora, rzeki, zbiornika..."
            className="w-full bg-surface-solid/95 backdrop-blur-xl border border-glass-border rounded-xl pl-10 pr-4 py-3 text-text-main text-sm placeholder:text-text-muted shadow-xl"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searchLoading}
          className="bg-primary/90 hover:bg-primary-light backdrop-blur-xl rounded-xl px-5 flex items-center justify-center shadow-xl border border-glass-border transition-colors min-w-[80px]"
        >
          {searchLoading ? (
            <div className="w-4 h-4 border-2 border-text-main border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-text-main font-medium text-sm">Szukaj</span>
          )}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-16 right-3 z-[1000] bg-surface-solid/90 backdrop-blur-xl rounded-xl p-3 border border-glass-border shadow-xl">
        {LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-2 mb-1 last:mb-0">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-text-secondary text-xs">{item.label}</span>
          </div>
        ))}
        {(spotsCount > 0 || osmLoading) && (
          <div className="mt-2 pt-2 border-t border-border-custom">
            {osmLoading ? (
              <span className="text-text-muted text-[10px]">Ladowanie...</span>
            ) : (
              <span className="text-text-muted text-[10px]">{spotsCount} lowisk z OSM</span>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <MapContainer center={center} zoom={11} className="flex-1 w-full map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMoveEnd={handleMoveEnd} />
        <FlyTo center={flyTarget} />

        {osmSpots.map((spot) => (
          <Marker
            key={`osm-${spot.osmId}`}
            position={[spot.lat, spot.lng]}
            icon={coloredIcon(getMarkerColor(spot.type))}
            eventHandlers={{ click: () => handleMarkerClick(spot) }}
          >
            <Popup>
              <div style={{ color: "#f0f0f5", fontSize: 13 }}>
                <b>{spot.name}</b>
                <br />
                <span style={{ color: "#9ca3b0", fontSize: 11 }}>
                  {spot.type}
                  {spot.distanceKm ? ` • ${spot.distanceKm} km` : ""}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}

        {userSpots.map((spot) => (
          <Marker key={`user-${spot.id}`} position={[spot.lat, spot.lng]} icon={coloredIcon("#f0a030")}>
            <Popup>
              <div style={{ color: "#f0f0f5", fontSize: 13 }}>
                <b>⭐ {spot.name}</b>
                <br />
                <span style={{ color: "#9ca3b0", fontSize: 11 }}>Dodane przez spolecznosc</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Spot detail panel */}
      {selectedSpot && (
        <div className="absolute bottom-16 lg:bottom-0 left-0 right-0 z-[1000] bg-surface-solid/95 backdrop-blur-xl border-t border-glass-border rounded-t-2xl p-5 max-h-[50vh] overflow-y-auto shadow-2xl animate-fade-in">
          <button
            onClick={() => setSelectedSpot(null)}
            className="absolute top-3 right-4 w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-surface-hover transition-colors"
          >
            ✕
          </button>
          <h3 className="text-text-main text-lg font-bold pr-10">{selectedSpot.name}</h3>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getMarkerColor(selectedSpot.type) }} />
            <span className="text-text-secondary text-sm">{selectedSpot.type}</span>
            {selectedSpot.distanceKm && (
              <span className="text-text-muted text-xs">• {selectedSpot.distanceKm} km</span>
            )}
          </div>

          {selectedSpot.loading ? (
            <div className="flex items-center gap-3 py-4">
              <div className="w-5 h-5 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
              <span className="text-text-secondary">AI analizuje lowisko...</span>
            </div>
          ) : selectedSpot.enriched ? (
            <div className="space-y-3">
              <p className="text-text-secondary text-sm leading-relaxed">{selectedSpot.enriched.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {selectedSpot.enriched.species?.length > 0 && (
                  <div className="bg-surface-light rounded-lg p-2.5">
                    <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">Gatunki</p>
                    <p className="text-text-main text-sm">🐟 {selectedSpot.enriched.species.join(", ")}</p>
                  </div>
                )}
                {selectedSpot.enriched.techniques?.length > 0 && (
                  <div className="bg-surface-light rounded-lg p-2.5">
                    <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">Techniki</p>
                    <p className="text-text-main text-sm">🎣 {selectedSpot.enriched.techniques.join(", ")}</p>
                  </div>
                )}
                {selectedSpot.enriched.bestSeasons?.length > 0 && (
                  <div className="bg-surface-light rounded-lg p-2.5">
                    <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">Sezon</p>
                    <p className="text-text-main text-sm">📅 {selectedSpot.enriched.bestSeasons.join(", ")}</p>
                  </div>
                )}
              </div>
              {selectedSpot.enriched.tip && (
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-3">
                  <p className="text-text-main text-sm">💡 {selectedSpot.enriched.tip}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-muted italic text-sm">Nie udalo sie pobrac info o lowisku</p>
          )}
        </div>
      )}
    </div>
  );
}
