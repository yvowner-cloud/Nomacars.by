import type { Lot } from "./types";
import { DAY } from "./time";

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export { DAY };
export const saleDate = (l: Lot) => new Date(l.saleAt);
export const activeOf = (lots: Lot[]) => lots.filter((l) => l.status === "active");
export const pastOf = (lots: Lot[]) => lots.filter((l) => l.status !== "active");
export const lotTitle = (l: Pick<Lot, "year" | "make" | "model">) => `${l.year} ${l.make} ${l.model}`;
/** До какого месяца действует льготная пошлина (5 лет с выпуска). */
export const graceUntil = (l: Pick<Lot, "month" | "year" | "monthKnown">) =>
  l.monthKnown === false ? `${l.year + 5} г. (уточнить месяц выпуска)` : `${String(l.month).padStart(2, "0")}.${l.year + 5}`;

/** Ближайшие торги: группировка активных лотов по дню и аукциону. */
export function upcomingFrom(lots: Lot[], now = Date.now()) {
  const m = new Map<string, { date: Date; auction: string; count: number }>();
  for (const l of activeOf(lots)) {
    const d = saleDate(l);
    if (+d < now - 12 * 3_600_000) continue;
    const key = `${d.toDateString()}-${l.auction}`;
    const cur = m.get(key);
    if (cur) cur.count++; else m.set(key, { date: d, auction: l.auction, count: 1 });
  }
  return [...m.values()].sort((a, b) => +a.date - +b.date);
}
