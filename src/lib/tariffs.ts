import type { Tariffs, UsState } from "./types";

/**
 * Стартовые тарифы. ДЕМО-ЗНАЧЕНИЯ — перед запуском сверить с действующими
 * ставками таможни РБ/РФ. На этапе 3 переезжают в базу и редактируются владельцем.
 */
export const DEFAULT_TARIFFS: Tariffs = {
  service: 700,
  ocean: 1350,
  landBy: 650,
  landRu: 1300,
  brokerBy: 400,
  brokerRu: 650,
  inland: { NJ: 300, GA: 400, TX: 450, FL: 400, CA: 650, IL: 450 },
  fees: [
    [3000, 450],
    [6000, 650],
    [10000, 850],
    [15000, 1000],
    [20000, 1150],
    [Number.MAX_SAFE_INTEGER, 1350],
  ],
  ccRates: [
    [1000, 1.5],
    [1500, 1.7],
    [1800, 2.5],
    [2300, 2.7],
    [3000, 3.0],
    [Number.MAX_SAFE_INTEGER, 3.6],
  ],
  utilBy: 1100,
  utilRuLow: 5200,
  utilRuHigh: 750000,
  evRuPct: 15,
  rub: 92,
  byn: 3.25,
  eurUsd: 1.08,
  deliveryDays: 75,
};

export const US_STATES: Record<UsState, { name: string; port: string }> = {
  NJ: { name: "Нью-Джерси", port: "Ньюарк" },
  GA: { name: "Джорджия", port: "Саванна" },
  TX: { name: "Техас", port: "Хьюстон" },
  FL: { name: "Флорида", port: "Джексонвилл" },
  CA: { name: "Калифорния", port: "Лос-Анджелес" },
  IL: { name: "Иллинойс", port: "Ньюарк (ж/д)" },
};
