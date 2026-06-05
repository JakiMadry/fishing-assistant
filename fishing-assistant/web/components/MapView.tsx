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
  if (type.includes("rzeka") || type.includes("strumień") || type.includes("kanał")) return "#38bdf8";
  if (type.includes("jezioro")) return "#a78bfa";
  if (type.includes("zbiornik")) return "#3b72f2";
  if (type.includes("łowisko") || type.includes("lowisko")) return "#f0a030";
  if (type.includes("staw")) return "#67e8f9";
  return "#9ca3b0";
}

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

function MapEvents({ onMoveEnd, onRightClick }: {
  onMoveEnd: (center: L.LatLng) => void;
  onRightClick: (latlng: L.LatLng) => void;
}) {
  useMapEvents({
    moveend: (e) => onMoveEnd(e.target.getCenter()),
    contextmenu: (e) => {
      e.originalEvent.preventDefault();
      onRightClick(e.latlng);
    },
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
  const [mapLoading, setMapLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [center] = useState<[number, number]>([52.23, 21.01]);
  const [addModal, setAddModal] = useState<{ lat: number; lng: number } | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [spotsCount, setSpotsCount] = useState(0);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNearbySpots = useCallback(async (lat: number, lon: number) => {
    setMapLoading(true);
    try {
      const res = await api.get(ENDPOINTS.spotsNearby, { params: { lat, lon, radius: 20000 } });
      const spots = res.data.osm || [];
      setOsmSpots(spots);
      setSpotsCount(spots.length);
    } catch {
      // silent
    } finally {
      setMapLoading(false);
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
    loadTimerRef.current = setTimeout(() => loadNearbySpots(c.lat, c.lng), 800);
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
      const res = await api.get(ENDPOINTS.spotsSearch, { params: { q: searchQuery } });
      const results = res.data.results || [];
      if (results.length > 0) {
        const first = results[0];
        setFlyTarget([first.lat, first.lng]);
        loadNearbySpots(first.lat, first.lng);
      }
    } catch {}
    setSearchLoading(false);
  }

  async function saveSpot() {
    if (!newName.trim() || !addModal) return;
    setSaving(true);
    try {
      const res = await api.post(ENDPOINTS.spotsUser, {
        name: newName.trim(), description: newDesc.trim(),
        lat: addModal.lat, lng: addModal.lng, type: "jezioro", isPublic: true,
      });
      setUserSpots((prev) => [...prev, res.data.spot]);
      setAddModal(null); setNewName(""); setNewDesc("");
    } catch {}
    setSaving(false);
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
        {spotsCount > 0 && (
          <div className="mt-2 pt-2 border-t border-border-custom">
            <span className="text-text-muted text-[10px]">{spotsCount} lowisk widocznych</span>
          </div>
        )}
      </div>

      {/* Loading pill */}
      {mapLoading && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] bg-surface-solid/95 backdrop-blur-xl rounded-full px-5 py-2.5 flex items-center gap-2 border border-glass-border shadow-xl">
          <div className="w-3.5 h-3.5 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">Pobieranie lowisk z OSM...</span>
        </div>
      )}

      {/* Hint */}
      <div className="absolute bottom-24 lg:bottom-4 right-3 z-[1000] bg-surface-solid/80 backdrop-blur rounded-lg px-3 py-1.5 border border-glass-border">
        <span className="text-text-muted text-[10px]">PPM = dodaj lowisko</span>
      </div>

      {/* Map */}
      <MapContainer center={center} zoom={11} className="flex-1 w-full" style={{ minHeight: "calc(100vh - 64px)" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMoveEnd={handleMoveEnd} onRightClick={(ll) => setAddModal({ lat: ll.lat, lng: ll.lng })} />
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
                <b>{spot.name}</b><br/>
                <span style={{ color: "#9ca3b0", fontSize: 11 }}>
                  {spot.type}{spot.distanceKm ? ` • ${spot.distanceKm} km` : ""}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}

        {userSpots.map((spot) => (
          <Marker key={`user-${spot.id}`} position={[spot.lat, spot.lng]} icon={coloredIcon("#f0a030")}>
            <Popup>
              <div style={{ color: "#f0f0f5", fontSize: 13 }}>
                <b>⭐ {spot.name}</b><br/>
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
            {selectedSpot.distanceKm && <span className="text-text-muted text-xs">• {selectedSpot.distanceKm} km</span>}
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

      {/* Add spot modal */}
      {addModal && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in">
          <div className="bg-surface-solid rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md space-y-4 border border-glass-border shadow-2xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-xl">📍</span>
              </div>
              <h3 className="text-text-main text-lg font-bold">Dodaj lowisko</h3>
            </div>
            <input
              type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Nazwa lowiska"
              className="w-full glass-card px-4 py-3 text-text-main placeholder:text-text-muted"
            />
            <textarea
              value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Opis (opcjonalnie)" rows={3}
              className="w-full glass-card px-4 py-3 text-text-main placeholder:text-text-muted resize-none"
            />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setAddModal(null); setNewName(""); setNewDesc(""); }}
                className="flex-1 py-3 rounded-xl border border-border-custom text-text-secondary hover:bg-surface-light transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={saveSpot} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-light text-text-main font-bold transition-all disabled:opacity-50"
              >
                {saving ? "Zapisywanie..." : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
