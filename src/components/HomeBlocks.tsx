"use client";

import { useState } from "react";
import type { PublicLot } from "@/lib/server/public-lots";
import { LotCard } from "./LotCard";
import { useApp } from "./Providers";

const PREMIUM = ["BMW", "Audi", "Mercedes-Benz", "Lexus", "Genesis", "Volvo", "Porsche", "Land Rover"];
const FILTERS: { key: string; label: string; test: (l: PublicLot) => boolean }[] = [
  { key: "all", label: "Все", test: () => true },
  { key: "suv", label: "Кроссоверы", test: (l) => l.body === "suv" },
  { key: "sedan", label: "Седаны", test: (l) => l.body === "sedan" },
  { key: "premium", label: "Премиум", test: (l) => PREMIUM.includes(l.make) },
  { key: "eco", label: "Гибриды и электро", test: (l) => l.fuel === "Гибрид" || l.fuel === "Электро" },
];

/** «Топ недели» с фильтрами-чипсами; пустые категории не показываются. */
export function TopLots({ lots, limit = 8 }: { lots: PublicLot[]; limit?: number }) {
  const [f, setF] = useState("all");
  const opts = FILTERS.map((x) => ({ ...x, n: lots.filter(x.test).length })).filter((x) => x.key === "all" || x.n > 0);
  const cur = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const list = lots.filter(cur.test).slice(0, limit);
  return (
    <>
      {opts.length > 2 && (
        <div className="x-chips" role="group" aria-label="Тип автомобиля" style={{ marginBottom: 20 }}>
          {opts.map((o) => (
            <button key={o.key} className="x-chip" aria-pressed={f === o.key} onClick={() => setF(o.key)}>{o.label}<em>{o.n}</em></button>
          ))}
        </div>
      )}
      <div className="grid x-cards" key={f}>{list.map((l) => <LotCard key={l.id} lot={l} />)}</div>
    </>
  );
}

/** Схема маршрута: США → Клайпеда / Поти → Минск или Москва (по выбранной стране). */
export function RouteMap() {
  const { country } = useApp();
  const city = country === "ru" ? "Москва" : "Минск";
  return (
    <div className="x-map">
      <svg viewBox="0 0 1000 120" role="img" aria-label={`Маршрут: аукцион в США, море до Клайпеды или Поти, автовоз до города ${city}`}>
        <line className="x-path" x1="60" y1="56" x2="940" y2="56" stroke="#a8191e" strokeWidth="3" />
        <circle cx="60" cy="56" r="10" fill="#1b1b1b" />
        <circle cx="500" cy="56" r="10" fill="#1b1b1b" />
        <circle cx="940" cy="56" r="10" fill="#a8191e" />
        <g className="x-ship" aria-hidden="true">
          <rect x="220" y="36" width="72" height="22" rx="3" fill="#3c3c3c" />
          <rect x="232" y="25" width="21" height="12" fill="#f0b400" />
          <rect x="257" y="25" width="21" height="12" fill="#a8191e" />
        </g>
        <text x="60" y="104" textAnchor="middle" fontFamily="Oswald, sans-serif" fontSize="19" fill="#1b1b1b">США</text>
        <text x="500" y="104" textAnchor="middle" fontFamily="Oswald, sans-serif" fontSize="19" fill="#1b1b1b">КЛАЙПЕДА / ПОТИ</text>
        <text x="940" y="104" textAnchor="middle" fontFamily="Oswald, sans-serif" fontSize="19" fill="#a8191e">{city.toUpperCase()}</text>
      </svg>
    </div>
  );
}
