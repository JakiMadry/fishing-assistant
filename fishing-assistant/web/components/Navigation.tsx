"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Warunki", icon: "☀️", desc: "Pogoda i oceny" },
  { href: "/mapa", label: "Mapa", icon: "🗺️", desc: "Odkryj lowiska" },
  { href: "/doradca", label: "AI Doradca", icon: "🤖", desc: "Rekomendacje" },
  { href: "/miejsca", label: "Miejsca", icon: "📍", desc: "Twoje lowiska" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-surface-solid border-r border-border-custom p-4 shrink-0">
        <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
          <span className="text-3xl">🎣</span>
          <div>
            <h1 className="text-text-main font-bold text-lg leading-tight">Asystent</h1>
            <p className="text-text-muted text-xs">Wedkarski</p>
          </div>
        </Link>

        <nav className="flex flex-col gap-1.5 flex-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-primary/20 text-text-main border border-glass-border glow-green"
                    : "text-text-secondary hover:text-text-main hover:bg-surface-light"
                }`}
              >
                <span className="text-xl w-8 text-center">{tab.icon}</span>
                <div>
                  <span className="block">{tab.label}</span>
                  <span className={`text-xs ${active ? "text-primary-light" : "text-text-muted"}`}>
                    {tab.desc}
                  </span>
                </div>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-light pulse-dot" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="glass-card p-3 mt-4">
          <p className="text-text-muted text-xs text-center">
            Powered by AI + OpenWeather + OSM
          </p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-solid/95 backdrop-blur-lg border-t border-glass-border">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[60px] ${
                  active
                    ? "text-primary-light"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-[10px] font-medium">{tab.label}</span>
                {active && (
                  <div className="absolute top-0 w-8 h-0.5 rounded-full bg-primary-light" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
