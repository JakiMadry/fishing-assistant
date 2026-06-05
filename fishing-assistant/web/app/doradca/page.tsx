"use client";

import { useState, useRef } from "react";
import api, { ENDPOINTS } from "@/lib/api";
import { getUserLocation } from "@/lib/utils";

interface BaitRecommendation {
  bait: string;
  type: string;
  color: string;
  size: string;
  technique: string;
  depth: string;
  confidence: number;
  reason: string;
}

interface AdviceResult {
  species: string;
  location: string;
  month: string;
  recommendations: BaitRecommendation[];
  spots: string;
  timing: string;
  waterTemp: string;
  conditions: string;
  tips: string[];
  warningIfAny?: string;
}

const QUICK_QUERIES = [
  { q: "Wisla, sandacz, czerwiec", icon: "🐟" },
  { q: "Jezioro Sniardwy, szczupak, wrzesien", icon: "🦈" },
  { q: "Odra, sum, lipiec", icon: "🐋" },
  { q: "Bug, brzana, maj", icon: "🐠" },
  { q: "Zbiornik, karp, sierpien", icon: "🎏" },
  { q: "Dunajec, pstrag, kwiecien", icon: "🐡" },
];

export default function AdvisorPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AdviceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function ask(q?: string) {
    const queryToSend = (q || query).trim();
    if (!queryToSend) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const loc = await getUserLocation();
      const res = await api.post(ENDPOINTS.advisorBait, {
        query: queryToSend,
        lat: loc?.lat,
        lon: loc?.lon,
      });
      setResult(res.data.advice);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Nie udalo sie pobrac rekomendacji. Sprawdz polaczenie i sprobuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  function handleQuickQuery(q: string) {
    setQuery(q);
    ask(q);
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-4 lg:p-6 animate-fade-in">
        {/* Header */}
        <div className="glass-card p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h1 className="text-text-main text-xl font-bold">AI Doradca Wedkarski</h1>
                <p className="text-text-muted text-xs">Powered by Groq LLM</p>
              </div>
            </div>
            <p className="text-text-secondary text-sm mt-3">
              Wpisz gatunek, lowisko i miesiac. Otrzymasz szczegolowe rekomendacje przynęt, technik i miejsc.
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder='np. "Wisla, sandacz, listopad"'
              className="w-full glass-card px-4 py-3.5 text-text-main text-[15px] placeholder:text-text-muted pr-12"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-xs">Enter</span>
          </div>
          <button
            onClick={() => ask()}
            disabled={loading}
            className="bg-primary hover:bg-primary-light disabled:opacity-50 text-text-main font-bold px-6 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary-glow min-w-[100px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-text-main border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              "Zapytaj"
            )}
          </button>
        </div>

        {/* Quick queries */}
        {!result && !loading && (
          <div className="mb-6">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-3">Szybkie zapytania</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_QUERIES.map(({ q, icon }) => (
                <button
                  key={q}
                  onClick={() => handleQuickQuery(q)}
                  className="glass-card glass-card-hover px-3 py-3 text-left flex items-center gap-2"
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-text-secondary text-sm">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center glow-accent">
                <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-text-main font-semibold text-lg">AI analizuje warunki...</p>
              <p className="text-text-muted text-sm mt-1">To moze potrwac kilka sekund</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass-card border-error/30 p-4 mb-4">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4 animate-fade-in">
            {/* Result header */}
            <div className="glass-card p-5 glow-green">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
                <div>
                  <p className="text-text-main text-lg font-bold">
                    {result.species} &bull; {result.location}
                  </p>
                  <p className="text-accent text-sm">{result.month}</p>
                </div>
              </div>
            </div>

            {/* Warning */}
            {result.warningIfAny && (
              <div className="glass-card p-4 border-warning/30">
                <p className="text-warning text-sm">⚠️ {result.warningIfAny}</p>
              </div>
            )}

            {/* Bait recommendations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎣</span>
                <h3 className="text-text-main font-bold">Rekomendowane przynety</h3>
              </div>
              {result.recommendations.map((rec, i) => (
                <div key={i} className="glass-card p-5 glass-card-hover">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-text-main text-lg font-bold">{rec.bait}</p>
                      <p className="text-accent text-sm mt-0.5">{rec.type}</p>
                    </div>
                    <div className="bg-primary-light/20 text-primary-light font-bold text-sm rounded-full px-3 py-1.5 border border-primary-light/30">
                      {rec.confidence}%
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <DetailTile icon="🎨" label="Kolor" value={rec.color} />
                    <DetailTile icon="📏" label="Rozmiar" value={rec.size} />
                    <DetailTile icon="🌊" label="Glebokosc" value={rec.depth} />
                  </div>

                  <div className="bg-surface-light rounded-lg p-3 mb-3">
                    <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Prowadzenie</p>
                    <p className="text-text-main text-sm">{rec.technique}</p>
                  </div>

                  <p className="text-text-secondary text-sm italic">💡 {rec.reason}</p>
                </div>
              ))}
            </div>

            {/* Info cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.spots && <InfoCard icon="📍" title="Gdzie szukac ryb" text={result.spots} />}
              {result.timing && <InfoCard icon="⏰" title="Najlepsze godziny" text={result.timing} />}
              {result.waterTemp && <InfoCard icon="🌡️" title="Temperatura wody" text={result.waterTemp} />}
              {result.conditions && <InfoCard icon="🌤️" title="Optymalne warunki" text={result.conditions} />}
            </div>

            {/* Tips */}
            {result.tips?.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="text-text-main font-bold mb-3">💡 Pro tips</h3>
                <div className="space-y-2">
                  {result.tips.map((tip, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="text-accent text-sm mt-0.5 shrink-0">▸</span>
                      <p className="text-text-secondary text-sm leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New query */}
            <button
              onClick={() => { setResult(null); setQuery(""); }}
              className="w-full glass-card glass-card-hover py-4 text-primary-light font-bold text-center"
            >
              Nowe zapytanie
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-surface-light rounded-lg p-2.5 text-center">
      <span className="text-sm">{icon}</span>
      <p className="text-text-main text-sm font-medium mt-0.5 truncate">{value}</p>
      <p className="text-text-muted text-[10px]">{label}</p>
    </div>
  );
}

function InfoCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <p className="text-accent font-semibold text-sm">{title}</p>
      </div>
      <p className="text-text-main text-sm leading-relaxed">{text}</p>
    </div>
  );
}
