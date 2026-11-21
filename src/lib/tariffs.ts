import type { Tariffs } from "./types";

/**
 * Стартовые тарифы. ДЕМО-ЗНАЧЕНИЯ — перед запуском сверить с действующими
 * ставками таможни РБ/РФ. На этапе 3 переезжают в базу и редактируются владельцем.
 */
export const DEFAULT_TARIFFS: Tariffs = {
  service: 700,
  // Логистика — прайс Lion Trans от 29.09 (Клайпеда и Поти). Зона IL (Средний Запад) в прайсе нет —
  // стоит NJ + 250 $ как оценка, уточнить у логиста. Доставка в Москву в прайсе нет — демо.
  sea: {
    "kl.NJ.sedan": 750, "kl.NJ.suv": 850,
    "kl.GA.sedan": 750, "kl.GA.suv": 850,
    "kl.FL.sedan": 825, "kl.FL.suv": 925,
    "kl.TX.sedan": 900, "kl.TX.suv": 1000,
    "kl.CA.sedan": 1250, "kl.CA.suv": 1400,
    "kl.IL.sedan": 1000, "kl.IL.suv": 1100,
    "poti.NJ.sedan": 850, "poti.NJ.suv": 950, "poti.NJ.big": 1150,
    "poti.GA.sedan": 850, "poti.GA.suv": 950, "poti.GA.big": 1150,
    "poti.FL.sedan": 950, "poti.FL.suv": 1050, "poti.FL.big": 1150,
    "poti.TX.sedan": 1150, "poti.TX.suv": 1250, "poti.TX.big": 1350,
    "poti.CA.sedan": 1450, "poti.CA.suv": 1550, "poti.CA.big": 1750,
    "poti.IL.sedan": 1100, "poti.IL.suv": 1200, "poti.IL.big": 1400,
  },
  klBigExtra: 200,
  landKlByEur: 650,
  loadKlEur: 15,
  fwdKlEur: 310,
  landRu: 1300,
  landPotiBy: 2150,
  landPotiByBig: 2350,
  landPotiRu: 1100,
  fwdPoti: 200,
  logistService: 100,
  evLoad: 150,
  daysKlaipedaBy: 60,
  daysKlaipedaRu: 75,
  daysPotiBy: 75,
  daysPotiRu: 70,
  brokerBy: 400,
  brokerRu: 650,
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

export { US_STATES } from "./geo";
