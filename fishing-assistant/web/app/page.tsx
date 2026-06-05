"use client";

import { useEffect, useState, useCallback } from "react";
import api, { ENDPOINTS } from "@/lib/api";
import { scoreColor, getUserLocation } from "@/lib/utils";
import LocationPicker from "@/components/LocationPicker";

interface ConditionsData {
  weather: {
    temperature: number;
    feelsLike: number;
    pressure: number;
    pressureTrend: string;
    windSpeed: number;
    humidity: number;
    cloudiness: number;
    description: string;
    forecast3h: Array<{ time: string; temp: number; pressure: number; description: string }>;
  };
  moon: {
    phaseName: string;
    phaseEmoji: string;
    illumination: number;
    moonrise: string | null;
    moonset: string | null;
    fishingTimes: Array<{ type: string; time: string; duration: string; label: string }>;
  };
  fishing: {
    overall: number;
    summary: string;
    topSpecies: Array<{ species: string; overall: number; rating: string; tip: string }>;
    generalConditions: string[];
  };
}

export default function ConditionsPage() {
  const [data, setData] = useState<ConditionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);

  const fetchConditions = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    setNeedsLocation(false);
    try {
      const res = await api.get(ENDPOINTS.conditions, { params: { lat, lon } });
      setData(res.data);
    } catch {
      setError("Nie mozna pobrac warunkow. Sprawdz czy backend dziala.");
    } finally {
      setLoading(false);
    }
  }, []);

  const tryGeoLocation = useCallback(async () => {
    setLoading(true);
    const loc = await getUserLocation();
    if (loc) {
      setLocationName("Twoja lokalizacja");
      fetchConditions(loc.lat, loc.lon);
    } else {
      setLoading(false);
      setNeedsLocation(true);
    }
  }, [fetchConditions]);

  useEffect(() => {
    tryGeoLocation();
  }, [tryGeoLocation]);

  if (needsLocation) {
    return (
      <LocationPicker
        onSelect={(loc) => {
          setLocationName(loc.name);
          fetchConditions(loc.lat, loc.lon);
        }}
        onRetryGeo={tryGeoLocation}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-primary/30 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-text-main font-medium">Pobieranie warunkow...</p>
          <p className="text-text-muted text-sm mt-1">Analizujemy pogode i aktywnosc ryb</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 animate-fade-in">
        <span className="text-5xl">⚠️</span>
        <p className="text-error text-center max-w-md">{error || "Brak danych"}</p>
        <button
          onClick={tryGeoLocation}
          className="bg-primary hover:bg-primary-light text-text-main font-bold px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary-glow"
        >
          Sprobuj ponownie
        </button>
      </div>
    );
  }

  const { weather, moon, fishing } = data;
  const scorePercent = fishing.overall / 100;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-4 lg:p-6 space-y-4 animate-fade-in">
        {/* Location header */}
        {locationName && (
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <span>📍</span>
            <span>{locationName}</span>
            <button
              onClick={() => setNeedsLocation(true)}
              className="text-primary-light hover:text-text-main text-xs ml-1 transition-colors"
            >
              zmien
            </button>
          </div>
        )}

        {/* Hero score card */}
        <div className="glass-card p-6 lg:p-8 glow-green relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            {/* Score ring */}
            <div className="relative w-36 h-36 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke={scoreColor(fishing.overall)}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  strokeDashoffset={283 - 283 * scorePercent}
                  className="score-ring"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold" style={{ color: scoreColor(fishing.overall) }}>
                  {fishing.overall}
                </span>
                <span className="text-text-muted text-xs">/100 pkt</span>
              </div>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-text-muted text-sm uppercase tracking-wider mb-1">Szanse na branie dzis</p>
              <h2 className="text-text-main text-2xl font-bold mb-2">
                {fishing.overall >= 80 ? "Doskonale warunki!" :
                 fishing.overall >= 65 ? "Bardzo dobre warunki" :
                 fishing.overall >= 50 ? "Dobre warunki" :
                 fishing.overall >= 35 ? "Przecietne warunki" : "Slabe warunki"}
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">{fishing.summary}</p>
            </div>
          </div>
        </div>

        {/* Weather + Moon grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Weather */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🌤️</span>
              <h3 className="text-text-main font-bold">Pogoda</h3>
              <span className="text-text-secondary text-sm ml-auto capitalize">{weather.description}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <WeatherTile icon="🌡️" label="Temperatura" value={`${weather.temperature}°C`} sub={`Odczuwalna ${weather.feelsLike}°C`} />
              <WeatherTile icon="📊" label="Cisnienie" value={`${weather.pressure}`} sub="hPa" />
              <WeatherTile
                icon={weather.pressureTrend === "rosnące" ? "📈" : weather.pressureTrend === "malejące" ? "📉" : "➡️"}
                label="Trend"
                value={weather.pressureTrend}
              />
              <WeatherTile icon="💨" label="Wiatr" value={`${weather.windSpeed}`} sub="km/h" />
              <WeatherTile icon="💧" label="Wilgotnosc" value={`${weather.humidity}%`} />
              <WeatherTile icon="☁️" label="Zachmurzenie" value={`${weather.cloudiness}%`} />
            </div>
          </div>

          {/* Moon */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🌙</span>
              <h3 className="text-text-main font-bold">Ksiezyc i Solunar</h3>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{moon.phaseEmoji}</span>
              <div>
                <p className="text-text-main font-semibold text-lg">{moon.phaseName}</p>
                <p className="text-text-secondary text-sm">Iluminacja: {moon.illumination}%</p>
                <div className="flex gap-3 mt-1 text-text-muted text-xs">
                  {moon.moonrise && <span>↑ {moon.moonrise}</span>}
                  {moon.moonset && <span>↓ {moon.moonset}</span>}
                </div>
              </div>
            </div>
            {moon.fishingTimes.length > 0 && (
              <div className="space-y-2">
                <p className="text-text-muted text-xs uppercase tracking-wider">Szczyty aktywnosci ryb</p>
                {moon.fishingTimes.map((ft, i) => (
                  <div key={i} className="flex items-center gap-3 bg-surface-light rounded-lg px-3 py-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ft.type === "major"
                          ? "bg-accent/20 text-accent"
                          : "bg-border-custom text-text-secondary"
                      }`}
                    >
                      {ft.type === "major" ? "GLOWNY" : "POBOCZNY"}
                    </span>
                    <span className="text-text-main text-sm font-medium">{ft.time}</span>
                    <span className="text-text-muted text-xs ml-auto">{ft.duration}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top species */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🏆</span>
            <h3 className="text-text-main font-bold">Najlepsze gatunki dzis</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {fishing.topSpecies.map((s, i) => (
              <div
                key={s.species}
                className={`relative bg-surface-light rounded-xl p-4 border transition-all duration-200 hover:border-glass-border ${
                  i === 0 ? "border-accent/30 glow-accent" : "border-transparent"
                }`}
              >
                {i === 0 && (
                  <div className="absolute -top-2 -right-2 bg-accent text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                    TOP
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      i === 0 ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary-light"
                    }`}
                  >
                    #{i + 1}
                  </div>
                  <div>
                    <p className="text-text-main font-bold">
                      {s.species.charAt(0).toUpperCase() + s.species.slice(1)}
                    </p>
                    <p className="text-text-muted text-xs">{s.rating}</p>
                  </div>
                </div>
                {/* Mini score bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted">Ocena</span>
                    <span className="font-bold" style={{ color: scoreColor(s.overall) }}>{s.overall}/100</span>
                  </div>
                  <div className="h-1.5 bg-border-custom rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${s.overall}%`, backgroundColor: scoreColor(s.overall) }}
                    />
                  </div>
                </div>
                <p className="text-text-secondary text-xs leading-relaxed">{s.tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly forecast */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⏱️</span>
            <h3 className="text-text-main font-bold">Prognoza godzinowa</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {weather.forecast3h.map((f, i) => (
              <div key={i} className="bg-surface-light rounded-xl p-3 text-center shrink-0 min-w-[80px] border border-transparent hover:border-glass-border transition-colors">
                <p className="text-text-muted text-xs font-medium">{f.time}</p>
                <p className="text-text-main font-bold text-lg my-1">{f.temp}°C</p>
                <p className="text-text-secondary text-[11px]">{f.pressure} hPa</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeatherTile({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-light rounded-xl p-3 text-center hover:bg-surface-hover transition-colors">
      <span className="text-lg">{icon}</span>
      <p className="text-text-main font-bold text-sm mt-1">{value}</p>
      {sub && <p className="text-text-muted text-[10px]">{sub}</p>}
      <p className="text-text-muted text-[10px] mt-0.5">{label}</p>
    </div>
  );
}
