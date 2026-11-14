import type { Body, DamageLevel, DamageZone, Fuel, Lot, UsState } from "./types";

/**
 * ДЕМО-ЛОТЫ для этапов 1–5. На этапе 6 заменяются данными из API аукционов
 * (адаптер AuctionDataProvider) и результатами еженедельной ИИ-подборки.
 */
type Raw = [
  number, string, string, string, number, number, Body, Fuel, number, number, number,
  string, DamageZone, DamageLevel, number, "Copart" | "IAAI", UsState, number, [number, number],
  number, number, number, string, boolean, Lot["status"]?,
];

const RAW: Raw[] = [
  [1, "Toyota", "RAV4", "XLE", 2022, 6, "suv", "Бензин", 2487, 203, 38200, "Передний бампер, фара", "front", "light", 14800, "Copart", "NJ", 94, [900, 1400], 31500, 36500, 3, "#B8BEC6", true],
  [2, "Hyundai", "Tucson", "SEL", 2023, 3, "suv", "Бензин", 2497, 187, 21400, "Задний бампер, дверь багажника", "rear", "light", 12600, "IAAI", "GA", 91, [800, 1300], 27900, 31800, 4, "#2E3E57", false],
  [3, "Kia", "Sportage", "LX", 2023, 5, "suv", "Бензин", 2497, 187, 18900, "Левое крыло, дверь", "side", "light", 13900, "Copart", "TX", 89, [700, 1100], 28400, 32500, 5, "#7A2E2A", false],
  [4, "Honda", "CR-V", "EX", 2022, 8, "suv", "Бензин", 1498, 190, 41000, "Передняя часть", "front", "mid", 13200, "Copart", "FL", 87, [1400, 2200], 29800, 34200, 6, "#E8E9EB", false],
  [5, "Toyota", "Camry", "SE", 2023, 2, "sedan", "Бензин", 2487, 203, 29800, "Задний бампер", "rear", "light", 12400, "IAAI", "CA", 92, [600, 1000], 29200, 33900, 3, "#1C1F24", true],
  [6, "Volkswagen", "Tiguan", "SE", 2022, 7, "suv", "Бензин", 1984, 184, 36500, "Правая сторона", "side", "mid", 10900, "Copart", "NJ", 84, [1300, 2000], 25600, 29700, 7, "#5B6470", false],
  [7, "Mazda", "CX-5", "Touring", 2023, 4, "suv", "Бензин", 2488, 187, 24100, "Передний бампер", "front", "light", 13500, "IAAI", "IL", 90, [700, 1200], 29900, 33600, 5, "#9E1B22", true],
  [8, "Nissan", "Rogue", "SV", 2022, 9, "suv", "Бензин", 1497, 201, 33700, "Град: капот и крыша", "hail", "light", 9800, "Copart", "TX", 82, [600, 1100], 23800, 27400, 8, "#3D5A80", false],
  [9, "Chevrolet", "Equinox", "LT", 2023, 1, "suv", "Бензин", 1490, 175, 27300, "Задняя часть", "rear", "mid", 9200, "Copart", "GA", 80, [1200, 1900], 22400, 25900, 9, "#D9DCE0", false],
  [10, "BMW", "X3", "xDrive30i", 2022, 5, "suv", "Бензин", 1998, 248, 34900, "Передняя часть", "front", "mid", 18700, "IAAI", "FL", 86, [2200, 3400], 43500, 52000, 6, "#14243F", false],
  [11, "Audi", "Q5", "Premium", 2022, 10, "suv", "Бензин", 1984, 261, 30200, "Левая сторона", "side", "mid", 19500, "Copart", "CA", 83, [1900, 2900], 44200, 53400, 10, "#8D9299", false],
  [12, "Mercedes-Benz", "GLC", "300 4MATIC", 2022, 6, "suv", "Бензин", 1991, 255, 28600, "Задний бампер", "rear", "light", 22400, "IAAI", "NJ", 85, [900, 1500], 49800, 58900, 4, "#F2F2F0", true],
  [13, "Hyundai", "Elantra", "SEL", 2023, 6, "sedan", "Бензин", 1999, 147, 19800, "Передний бампер", "front", "light", 8900, "Copart", "FL", 93, [500, 900], 19900, 22600, 2, "#4A6B8A", true],
  [14, "Kia", "K5", "LXS", 2023, 3, "sedan", "Бензин", 1598, 180, 22500, "Правое крыло", "side", "light", 11300, "IAAI", "TX", 88, [600, 1000], 25300, 29100, 5, "#B1B6BC", false],
  [15, "Tesla", "Model 3", "RWD", 2023, 1, "sedan", "Электро", 0, 283, 26700, "Задняя часть", "rear", "mid", 16900, "Copart", "CA", 87, [1500, 2400], 30500, 35800, 7, "#C8102E", false],
  [16, "Toyota", "Corolla", "LE", 2023, 7, "sedan", "Бензин", 1798, 139, 17600, "Задняя дверь", "side", "light", 9600, "Copart", "IL", 91, [500, 800], 21400, 23800, 3, "#EDEDED", true],
  [21, "Subaru", "Forester", "Premium", 2023, 5, "suv", "Бензин", 2498, 180, 24600, "Задний бампер", "rear", "light", 12900, "Copart", "IL", 90, [600, 1000], 28100, 31900, 6, "#3F5E4A", false],
  [22, "Kia", "Sorento", "LX", 2022, 11, "suv", "Бензин", 2497, 191, 31800, "Правая дверь", "side", "light", 13700, "IAAI", "TX", 88, [800, 1300], 30900, 35400, 8, "#1E2B3D", false],
  [17, "Toyota", "RAV4 Hybrid", "XLE", 2022, 9, "suv", "Гибрид", 2487, 219, 32400, "Переднее крыло", "front", "light", 17250, "Copart", "NJ", 92, [700, 1200], 35400, 40100, -8, "#6E7D8C", false, "sold"],
  [18, "Hyundai", "Santa Fe", "SEL", 2022, 8, "suv", "Бензин", 2497, 191, 35100, "Задний бампер", "rear", "light", 14100, "IAAI", "GA", 88, [700, 1100], 31600, 36300, -6, "#2B2F36", false, "sold"],
  [19, "Honda", "Accord", "Sport", 2023, 4, "sedan", "Бензин", 1498, 192, 23900, "Левая сторона", "side", "light", 13400, "Copart", "TX", 89, [800, 1300], 28700, 32900, -4, "#9AA1A9", false, "sold"],
  [20, "Mazda", "3", "Select", 2023, 2, "sedan", "Бензин", 2488, 191, 20800, "Передний бампер", "front", "light", 8400, "IAAI", "FL", 86, [600, 1000], 20800, 24100, -2, "#7B1E26", false, "ended"],
];

const VIN_PREFIX: Record<string, string> = {
  Toyota: "2T3", Hyundai: "KM8", Kia: "5XY", Honda: "7FA", Volkswagen: "3VV", Mazda: "JM3", Nissan: "5N1",
  Chevrolet: "3GN", BMW: "5UX", Audi: "WA1", "Mercedes-Benz": "W1N", Tesla: "5YJ", Subaru: "JF2",
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const LOTS: Lot[] = RAW.map((r) => {
  const [id, make, model, trim, year, month, body, fuel, cc, hp, miles, damage, zone, level, price, auction,
    state, aiScore, repair, mBy, mRu, saleOffsetDays, color, top, status] = r;
  return {
    id, make, model, trim, year, month, body, fuel, cc, hp, miles, damage, zone, level, price, auction, state,
    aiScore, repair, market: { by: mBy, ru: mRu }, saleOffsetDays, color, top, status: status ?? "active",
    slug: `${slugify(`${make}-${model}-${year}`)}-${id}`,
    lotNo: (auction === "Copart" ? "7" : "4") + String(1_000_000 + id * 73_919).slice(1, 8),
    vin: `${VIN_PREFIX[make] ?? "1XX"}W1RFV${id % 9}${year === 2022 ? "N" : "P"}•••${String(4000 + id * 137).slice(-3)}`,
  };
});

export const DAY = 86_400_000;
export const saleDate = (l: Lot, now = Date.now()) => new Date(now + l.saleOffsetDays * DAY);
export const lotBySlug = (slug: string) => LOTS.find((l) => l.slug === slug);
export const activeLots = () => LOTS.filter((l) => l.status === "active");
export const pastLots = () => LOTS.filter((l) => l.status !== "active");
export const lotTitle = (l: Lot) => `${l.year} ${l.make} ${l.model}`;
export const graceUntil = (l: Lot) =>
  `${String(l.month).padStart(2, "0")}.${l.year + 5}`;

/** Ставка для расчёта: текущая ставка лота */
export const bidFor = (l: Lot) => l.price;

/** Ближайшие торги: группировка активных лотов по дню и аукциону. */
export function upcomingAuctions(now = Date.now()) {
  const m = new Map<string, { date: Date; auction: string; count: number }>();
  for (const l of activeLots()) {
    const d = saleDate(l, now);
    const key = `${d.toDateString()}-${l.auction}`;
    const cur = m.get(key);
    if (cur) cur.count++; else m.set(key, { date: d, auction: l.auction, count: 1 });
  }
  return [...m.values()].sort((a, b) => +a.date - +b.date);
}
