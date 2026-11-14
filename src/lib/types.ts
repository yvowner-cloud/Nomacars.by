export type Country = "by" | "ru";
export type Fuel = "Бензин" | "Дизель" | "Гибрид" | "Электро";
export type Body = "suv" | "sedan";
export type DamageZone = "front" | "rear" | "side" | "hail";
export type DamageLevel = "light" | "mid";
export type LotStatus = "active" | "sold" | "ended";
export type UsState = "NJ" | "GA" | "TX" | "FL" | "CA" | "IL";

export interface Lot {
  id: number;
  slug: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  month: number; // месяц выпуска 1–12
  body: Body;
  fuel: Fuel;
  cc: number; // объём, см³ (0 для электро)
  hp: number;
  miles: number;
  damage: string;
  zone: DamageZone;
  level: DamageLevel;
  price: number; // текущая ставка или цена выкупа, $
  auction: "Copart" | "IAAI";
  state: UsState;
  aiScore: number; // 0–100
  repair: [number, number]; // оценка ремонта, $
  /** Медиана рынка, $ — только для внутреннего отбора, на сайте не показывается */
  market: { by: number; ru: number };
  saleOffsetDays: number; // демо: торги относительно «сегодня»
  color: string;
  top: boolean;
  status: LotStatus;
  lotNo: string;
  vin: string;
}

export interface CalcInput {
  price: number;
  auction?: string;
  state: UsState | string;
  fuel: Fuel | string;
  cc: number;
  hp: number;
}

export interface CalcLine {
  label: string;
  usd: number;
  note: string;
}

export interface CalcResult {
  lines: CalcLine[];
  total: number;
  local: number;
  currency: "BYN" | "₽";
  days: string;
}

export interface Tariffs {
  service: number;
  ocean: number;
  landBy: number;
  landRu: number;
  brokerBy: number;
  brokerRu: number;
  inland: Record<string, number>;
  /** [цена лота до, сбор] */
  fees: [number, number][];
  /** [объём до см³, €/см³] — авто 3–5 лет */
  ccRates: [number, number][];
  utilBy: number; // BYN
  utilRuLow: number; // ₽, до 160 л.с.
  utilRuHigh: number; // ₽, свыше 160 л.с.
  evRuPct: number;
  rub: number; // ₽ за 1 $
  byn: number; // BYN за 1 $
  eurUsd: number; // $ за 1 €
  deliveryDays: number;
}
