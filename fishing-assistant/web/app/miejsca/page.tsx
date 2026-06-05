"use client";

import { useEffect, useState, useMemo } from "react";
import api, { ENDPOINTS } from "@/lib/api";

interface UserSpot {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: string;
  description?: string;
  species?: string[];
  techniques?: string[];
  difficulty?: string;
  createdAt: string;
}

interface Catch {
  id: number;
  species: string;
  weight?: number;
  length?: number;
  bait?: string;
  technique?: string;
  catchDate: string;
  note?: string;
}

const TYPE_ICONS: Record<string, string> = {
  jezioro: "🏞️",
  rzeka: "🌊",
  staw: "💧",
  zbiornik: "🌀",
  "łowisko komercyjne": "🎣",
  kanał: "🚢",
  strumień: "🏔️",
};

function getIcon(type: string) {
  for (const [key, icon] of Object.entries(TYPE_ICONS)) {
    if (type.includes(key)) return icon;
  }
  return "📍";
}

export default function SpotsPage() {
  const [spots, setSpots] = useState<UserSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<UserSpot | null>(null);
  const [catches, setCatches] = useState<Catch[]>([]);
  const [catchesLoading, setCatchesLoading] = useState(false);
  const [enrichedSpot, setEnrichedSpot] = useState<any | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [addCatchVisible, setAddCatchVisible] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filterText, setFilterText] = useState("");

  useEffect(() => { loadSpots(); }, []);

  async function loadSpots() {
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.spotsUser);
      setSpots(res.data.spots || []);
    } catch { setSpots([]); }
    finally { setLoading(false); }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await api.get(ENDPOINTS.spotsSearch, { params: { q: searchQuery } });
      setSearchResults(res.data.results || []);
    } catch { setSearchResults([]); }
    setSearchLoading(false);
  }

  async function addFromSearch(result: any) {
    try {
      const res = await api.post(ENDPOINTS.spotsUser, {
        name: result.name,
        lat: result.lat,
        lng: result.lng,
        type: result.type || "zbiornik wodny",
        description: result.fullName || "",
        isPublic: true,
      });
      setSpots((prev) => [...prev, res.data.spot]);
      setSearchResults([]);
      setSearchQuery("");
    } catch {}
  }

  const filteredSpots = useMemo(() => {
    if (!filterText.trim()) return spots;
    const q = filterText.toLowerCase();
    return spots.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.type?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }, [spots, filterText]);

  async function openSpot(spot: UserSpot) {
    setSelectedSpot(spot);
    setCatches([]);
    setEnrichedSpot(null);
    setCatchesLoading(true);
    setEnrichLoading(true);

    try {
      const res = await api.get(`${ENDPOINTS.spotsUser}/${spot.id}/catches`);
      setCatches(res.data.catches || []);
    } catch {}
    setCatchesLoading(false);

    try {
      const res = await api.get(ENDPOINTS.spotsEnrich, {
        params: { name: spot.name, type: spot.type, lat: spot.lat, lon: spot.lng },
      });
      setEnrichedSpot(res.data.enriched);
    } catch {}
    setEnrichLoading(false);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Spot detail view
  if (selectedSpot) {
    return (
      <div className="flex-1 flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-border-custom">
          <button
            onClick={() => setSelectedSpot(null)}
            className="flex items-center gap-2 text-primary-light hover:text-text-main transition-colors"
          >
            <span>←</span>
            <span className="text-sm font-medium">Wroc</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!confirm('Na pewno usunac to lowisko?')) return;
                try {
                  await api.delete(`${ENDPOINTS.spotsUser}/${selectedSpot.id}`);
                  setSpots((prev) => prev.filter((s) => s.id !== selectedSpot.id));
                  setSelectedSpot(null);
                } catch {}
              }}
              className="border border-error/30 text-error hover:bg-error/10 px-4 py-2 rounded-xl text-sm transition-colors"
            >
              Usun
            </button>
            <button
              onClick={() => setAddCatchVisible(true)}
              className="bg-primary hover:bg-primary-light text-text-main font-bold px-4 py-2 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-primary-glow"
            >
              + Dodaj polow
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 max-w-4xl mx-auto w-full space-y-4">
          {/* Spot info */}
          <div className="glass-card p-5 glow-green">
            <h1 className="text-text-main text-2xl font-bold">{selectedSpot.name}</h1>
            <p className="text-accent text-sm mt-1">{selectedSpot.type}</p>
            {selectedSpot.description && (
              <p className="text-text-secondary text-sm mt-3 leading-relaxed">{selectedSpot.description}</p>
            )}
          </div>

          {/* AI enrichment */}
          {enrichLoading ? (
            <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-text-secondary text-sm">AI analizuje lowisko...</span>
            </div>
          ) : enrichedSpot ? (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🤖</span>
                <h3 className="text-accent font-bold text-sm">Analiza AI</h3>
              </div>
              {enrichedSpot.description && (
                <p className="text-text-secondary text-sm leading-relaxed mb-3">{enrichedSpot.description}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {enrichedSpot.species?.length > 0 && (
                  <div className="bg-surface-light rounded-lg p-3">
                    <p className="text-text-main text-sm">🐟 {enrichedSpot.species.join(", ")}</p>
                  </div>
                )}
                {enrichedSpot.techniques?.length > 0 && (
                  <div className="bg-surface-light rounded-lg p-3">
                    <p className="text-text-main text-sm">🎣 {enrichedSpot.techniques.join(", ")}</p>
                  </div>
                )}
              </div>
              {enrichedSpot.tip && (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 mt-3">
                  <p className="text-text-main text-sm">💡 {enrichedSpot.tip}</p>
                </div>
              )}
            </div>
          ) : null}

          {/* Catch history */}
          <div>
            <h3 className="text-text-main font-bold text-lg mb-3">Historia polowow</h3>
            {catchesLoading ? (
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            ) : catches.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <span className="text-4xl block mb-3">🎣</span>
                <p className="text-text-muted">Brak zapisanych polowow. Dodaj pierwszy!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {catches.map((c) => (
                  <div key={c.id} className="glass-card glass-card-hover p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-text-main font-bold">{c.species}</span>
                      <span className="text-text-muted text-xs">
                        {new Date(c.catchDate).toLocaleDateString("pl-PL")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-text-secondary text-sm">
                      {c.weight && <span>⚖️ {c.weight} kg</span>}
                      {c.length && <span>📏 {c.length} cm</span>}
                      {c.bait && <span>🎣 {c.bait}</span>}
                      {c.technique && <span>🎯 {c.technique}</span>}
                    </div>
                    {c.note && <p className="text-text-muted text-sm italic mt-2">{c.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add catch modal */}
        {addCatchVisible && (
          <AddCatchModal
            spotId={selectedSpot.id}
            onClose={() => setAddCatchVisible(false)}
            onAdd={(c) => { setCatches((prev) => [c, ...prev]); setAddCatchVisible(false); }}
          />
        )}
      </div>
    );
  }

  // Spots list
  return (
    <div className="flex-1 flex flex-col animate-fade-in overflow-hidden">
      <div className="max-w-4xl mx-auto w-full p-4 lg:p-6 flex flex-col flex-1 overflow-hidden">
        {/* Header + Search */}
        <div className="shrink-0 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-glass-border flex items-center justify-center shrink-0">
              <span className="text-xl">📍</span>
            </div>
            <div>
              <h1 className="text-text-main text-xl font-bold">Lowiska</h1>
              <p className="text-text-muted text-sm">{spots.length} zapisanych lowisk</p>
            </div>
          </div>

          {/* OSM Search */}
          <div className="glass-card p-4 mb-3">
            <p className="text-text-secondary text-xs mb-2 font-medium uppercase tracking-wider">Wyszukaj i dodaj lowisko</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Szukaj jeziora, rzeki..."
                className="flex-1 bg-surface-light border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm placeholder:text-text-muted"
              />
              <button
                onClick={handleSearch}
                disabled={searchLoading}
                className="bg-primary hover:bg-primary-light text-text-main font-medium px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 shrink-0"
              >
                {searchLoading ? "..." : "Szukaj"}
              </button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-surface-light/50 rounded-lg px-3 py-2 border border-border-custom"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-text-main text-sm font-medium truncate">{r.name}</p>
                      <p className="text-text-muted text-xs truncate">{r.fullName}</p>
                    </div>
                    <button
                      onClick={() => addFromSearch(r)}
                      className="ml-3 text-primary hover:text-primary-light text-sm font-bold shrink-0 px-3 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      + Dodaj
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filter existing spots */}
          {spots.length > 6 && (
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filtruj swoje lowiska..."
              className="w-full bg-surface-light border border-border-custom rounded-xl px-4 py-2.5 text-text-main text-sm placeholder:text-text-muted mb-3"
            />
          )}
        </div>

        {/* Spots list - scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredSpots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-4xl">🎣</span>
              <h2 className="text-text-main text-lg font-bold text-center">
                {spots.length === 0 ? "Brak zapisanych lowisk" : "Brak wynikow"}
              </h2>
              <p className="text-text-secondary text-sm text-center max-w-sm">
                {spots.length === 0
                  ? "Uzyj wyszukiwarki powyzej, zeby znalezc i dodac lowisko."
                  : "Zmien fraze filtrowania."}
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredSpots.map((spot) => (
                <button
                  key={spot.id}
                  onClick={() => openSpot(spot)}
                  className="w-full glass-card glass-card-hover p-3.5 text-left flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors text-lg">
                    {getIcon(spot.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-text-main font-bold text-sm truncate">{spot.name}</p>
                      <span className="text-text-muted text-[10px] bg-surface-light px-2 py-0.5 rounded-full shrink-0">{spot.type}</span>
                    </div>
                    {spot.description && (
                      <p className="text-text-secondary text-xs mt-0.5 line-clamp-1">{spot.description}</p>
                    )}
                  </div>
                  <span className="text-text-muted text-lg group-hover:text-primary-light transition-colors shrink-0">›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddCatchModal({
  spotId, onClose, onAdd,
}: {
  spotId: number;
  onClose: () => void;
  onAdd: (c: any) => void;
}) {
  const [species, setSpecies] = useState("");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [bait, setBait] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!species.trim()) return;
    setSaving(true);
    try {
      await api.post(`${ENDPOINTS.spotsUser}/${spotId}/catch`, {
        species: species.trim(),
        weight: weight ? parseFloat(weight) : null,
        length: length ? parseFloat(length) : null,
        bait: bait.trim() || null,
        note: note.trim() || null,
        catchDate: new Date().toISOString(),
      });
      onAdd({ species, weight, length, bait, note, catchDate: new Date().toISOString() });
    } catch {}
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in">
      <div className="bg-surface-solid rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md space-y-3 border border-glass-border shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <span className="text-xl">🐟</span>
          </div>
          <h3 className="text-text-main text-lg font-bold">Zapisz polow</h3>
        </div>
        <input
          type="text" value={species} onChange={(e) => setSpecies(e.target.value)}
          placeholder="Gatunek (np. sandacz)"
          className="w-full glass-card px-4 py-3 text-text-main placeholder:text-text-muted"
        />
        <div className="flex gap-2">
          <input
            type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
            placeholder="Waga (kg)"
            className="flex-1 glass-card px-4 py-3 text-text-main placeholder:text-text-muted"
          />
          <input
            type="number" value={length} onChange={(e) => setLength(e.target.value)}
            placeholder="Dlugosc (cm)"
            className="flex-1 glass-card px-4 py-3 text-text-main placeholder:text-text-muted"
          />
        </div>
        <input
          type="text" value={bait} onChange={(e) => setBait(e.target.value)}
          placeholder="Przyneta"
          className="w-full glass-card px-4 py-3 text-text-main placeholder:text-text-muted"
        />
        <textarea
          value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Notatka"
          rows={2}
          className="w-full glass-card px-4 py-3 text-text-main placeholder:text-text-muted resize-none"
        />
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border-custom text-text-secondary hover:bg-surface-light transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-light text-text-main font-bold transition-all disabled:opacity-50"
          >
            {saving ? "Zapisywanie..." : "Zapisz"}
          </button>
        </div>
      </div>
    </div>
  );
}
