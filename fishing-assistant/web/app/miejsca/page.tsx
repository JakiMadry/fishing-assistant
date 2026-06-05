"use client";

import { useEffect, useState } from "react";
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

export default function SpotsPage() {
  const [spots, setSpots] = useState<UserSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<UserSpot | null>(null);
  const [catches, setCatches] = useState<Catch[]>([]);
  const [catchesLoading, setCatchesLoading] = useState(false);
  const [enrichedSpot, setEnrichedSpot] = useState<any | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [addCatchVisible, setAddCatchVisible] = useState(false);

  useEffect(() => { loadSpots(); }, []);

  async function loadSpots() {
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.spotsUser);
      setSpots(res.data.spots || []);
    } catch { setSpots([]); }
    finally { setLoading(false); }
  }

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
          <button
            onClick={() => setAddCatchVisible(true)}
            className="bg-primary hover:bg-primary-light text-text-main font-bold px-4 py-2 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-primary-glow"
          >
            + Dodaj polow
          </button>
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
    <div className="flex-1 overflow-y-auto animate-fade-in">
      <div className="max-w-4xl mx-auto w-full p-4 lg:p-6">
        {/* Header */}
        <div className="glass-card p-5 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-glass-border flex items-center justify-center">
              <span className="text-xl">📍</span>
            </div>
            <div>
              <h1 className="text-text-main text-xl font-bold">Lowiska spolecznosci</h1>
              <p className="text-text-muted text-sm mt-0.5">Kliknij PPM na mapie, zeby dodac nowe lowisko</p>
            </div>
          </div>
        </div>

        {spots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-surface-light border border-glass-border flex items-center justify-center">
              <span className="text-4xl">📍</span>
            </div>
            <h2 className="text-text-main text-lg font-bold text-center">Brak zapisanych lowisk</h2>
            <p className="text-text-secondary text-sm text-center max-w-sm">
              Otworz Mape i kliknij prawym przyciskiem myszy w dowolnym miejscu, zeby dodac swoje lowisko.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {spots.map((spot) => (
              <button
                key={spot.id}
                onClick={() => openSpot(spot)}
                className="glass-card glass-card-hover p-4 text-left flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <span className="text-lg">🎣</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-main font-bold">{spot.name}</p>
                  <p className="text-accent text-xs mt-0.5">{spot.type}</p>
                  {spot.description && (
                    <p className="text-text-secondary text-sm mt-1 line-clamp-1">{spot.description}</p>
                  )}
                </div>
                <span className="text-text-muted text-lg group-hover:text-primary-light transition-colors shrink-0">›</span>
              </button>
            ))}
          </div>
        )}
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
