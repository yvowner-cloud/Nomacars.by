export type Country = "by" | "ru";
export type Fuel = "Бензин" | "Дизель" | "Гибрид" | "Электро";
export type Body = "suv" | "sedan" | "coupe" | "convertible" | "other";
/** Подписи кузова: полная (страница лота, фильтр) и короткая (карточка). */
export const BODY_LABEL: Record<Body, string> = { suv: "Кроссовер / SUV", sedan: "Седан", coupe: "Купе", convertible: "Кабриолет", other: "Другой" };
export const BODY_SHORT: Record<Body, string | null> = { suv: "кроссовер", sedan: "седан", coupe: "купе", convertible: "кабриолет", other: null };
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
  auction: "Copart" | "IAAI" | "Manheim";
  /** Двухбуквенный код штата (любой штат США) */
  state: UsState | string;
  aiScore: number; // 0–100
  repair: [number, number]; // оценка ремонта, $
  /** Медиана рынка, $ — только для внутреннего отбора, на сайте не показывается */
  market: { by: number; ru: number };
  /** Дата и время торгов, ISO */
  saleAt: string;
  color: string;
  top: boolean;
  status: LotStatus;
  lotNo: string;
  vin: string;
  /** Реальные фото с аукциона (у демо-лотов нет — рисуется заглушка) */
  photos?: string[];
  /** Известен ли месяц выпуска (иначе month = 1, считаем осторожно) */
  monthKnown?: boolean;
  /** Оценка состояния Manheim (Condition Report, 0–5) */
  conditionGrade?: number | null;
  /** Мощность не указана на аукционе — оценена по объёму */
  hpEstimated?: boolean;
  /** Разбор лота, подготовленный при отборе */
  review?: { summary: string; plain: string; why: string[]; risks: string[] };
  /** Доп. сведения с аукциона */
  extra?: {
    city?: string | null; title?: string | null; runAndDrive?: boolean | null; keys?: boolean | null;
    airbags?: boolean | null; colorName?: string | null; drive?: string | null; transmission?: string | null;
    engine?: string | null; odometerStatus?: string | null; secondaryDamage?: string | null; url?: string | null;
  };
}

export interface CalcInput {
  price: number;
  auction?: string;
  state: UsState | string;
  fuel: Fuel | string;
  cc: number;
  hp: number;
  /** Размер для тарифа доставки; если не указан — определяется по кузову и модели */
  size?: VehicleSize;
  body?: string;
  make?: string;
  model?: string;
}

/** Класс машины в прайсе логиста: седан, SUV (BMW X5), большой SUV (BMW X7, Audi Q7, Ford Explorer). */
export type VehicleSize = "sedan" | "suv" | "big";

export interface CalcLine {
  label: string;
  usd: number;
  note: string;
}

/** Маршрут морской доставки: через Клайпеду (Литва) или через Поти (Грузия). */
export type Route = "klaipeda" | "poti";

export interface CalcResult {
  lines: CalcLine[];
  total: number;
  local: number;
  currency: "BYN" | "₽";
  days: string;
  route: Route;
  routeName: string;
}

export interface Tariffs {
  service: number;
  /**
   * Доставка со стоянки аукциона + море, $ — по прайсу логиста (Lion Trans).
   * Ключи: "kl.NJ.sedan", "kl.NJ.suv", "poti.NJ.sedan", "poti.NJ.suv", "poti.NJ.big" — для зон NJ, GA, FL, TX, CA, IL.
   */
  sea: Record<string, number>;
  /** Клайпеда: большой SUV = седан + надбавка, $ */
  klBigExtra: number;
  /** Клайпеда → Минск, погрузка на автовоз, экспедирование — в евро */
  landKlByEur: number;
  loadKlEur: number;
  fwdKlEur: number;
  /** Клайпеда → Москва, $ */
  landRu: number;
  /** Поти → Минск, $ (седан/SUV и большой SUV) */
  landPotiBy: number;
  landPotiByBig: number;
  /** Поти → Москва, $ */
  landPotiRu: number;
  /** Поти: экспедирование и портовые сборы (THC), $ */
  fwdPoti: number;
  /** Услуга логиста за машину, $ */
  logistService: number;
  /** Погрузка гибрида/электромобиля, $ */
  evLoad: number;
  /** Срок в пути от торгов до получения, дней — по маршрутам и странам */
  daysKlaipedaBy: number;
  daysKlaipedaRu: number;
  daysPotiBy: number;
  daysPotiRu: number;
  brokerBy: number;
  brokerRu: number;
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
