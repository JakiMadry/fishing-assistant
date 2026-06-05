"use client";

import { useState } from "react";

const POPULAR_CITIES = [
  { name: "Warszawa", lat: 52.23, lon: 21.01 },
  { name: "Krakow", lat: 50.06, lon: 19.94 },
  { name: "Gdansk", lat: 54.35, lon: 18.65 },
  { name: "Wroclaw", lat: 51.11, lon: 17.04 },
  { name: "Poznan", lat: 52.41, lon: 16.93 },
  { name: "Lodz", lat: 51.76, lon: 19.46 },
  { name: "Szczecin", lat: 53.43, lon: 14.55 },
  { name: "Lublin", lat: 51.25, lon: 22.57 },
  { name: "Katowice", lat: 50.26, lon: 19.03 },
  { name: "Bialystok", lat: 53.13, lon: 23.16 },
  { name: "Olsztyn", lat: 53.78, lon: 20.49 },
  { name: "Bydgoszcz", lat: 53.12, lon: 18.01 },
];

interface LocationPickerProps {
  onSelect: (loc: { lat: number; lon: number; name: string }) => void;
  onRetryGeo: () => void;
}

export default function LocationPicker({ onSelect, onRetryGeo }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: searchQuery, format: "json", limit: "1", addressdetails: "1" });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { "User-Agent": "FishingAssistant/1.0" },
      });
      if (!res.ok) { setSearching(false); return; }
      const data = await res.json();
      if (data.length > 0) {
        const r = data[0];
        onSelect({ lat: parseFloat(r.lat), lon: parseFloat(r.lon), name: r.display_name.split(",")[0] });
      }
    } catch {}
    setSearching(false);
  }

  return (
    <div className="flex-1 overflow-y-auto animate-fade-in">
      <div className="max-w-sm mx-auto w-full px-3 pt-6 pb-20 space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 border border-glass-border flex items-center justify-center">
            <span className="text-2xl">📍</span>
          </div>
          <h2 className="text-text-main text-xl font-bold">Wybierz lokalizacje</h2>
          <p className="text-text-secondary text-sm">
            Nie mamy dostepu do GPS. Wybierz miasto lub wpisz wspolrzedne.
          </p>
        </div>

        {/* GPS retry */}
        <button
          onClick={onRetryGeo}
          className="w-full glass-card glass-card-hover py-3.5 flex items-center justify-center gap-2 text-primary-light font-semibold text-sm"
        >
          <span>🛰️</span>
          Sprobuj ponownie z GPS
        </button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-custom" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-bg px-3 text-text-muted text-xs">lub wybierz miasto</span>
          </div>
        </div>

        {/* Cities grid */}
        <div className="grid grid-cols-3 gap-2">
          {POPULAR_CITIES.map((city) => (
            <button
              key={city.name}
              onClick={() => onSelect({ lat: city.lat, lon: city.lon, name: city.name })}
              className="glass-card glass-card-hover py-2.5 px-1 text-text-secondary text-sm text-center font-medium"
            >
              {city.name}
            </button>
          ))}
        </div>

        {/* Search by name */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-custom" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-bg px-3 text-text-muted text-xs">lub wpisz nazwe</span>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="np. Kartuzy, Sniardwy..."
            className="flex-1 glass-card px-3 py-2.5 text-text-main placeholder:text-text-muted text-sm min-w-0"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="bg-primary hover:bg-primary-light text-text-main font-bold px-4 rounded-xl transition-all shrink-0 disabled:opacity-50"
          >
            {searching ? "..." : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
