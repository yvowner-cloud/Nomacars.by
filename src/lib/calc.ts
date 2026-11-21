import type { CalcInput, CalcResult, Country, Route, Tariffs } from "./types";
import { DEFAULT_TARIFFS } from "./tariffs";
import { stateInfo } from "./geo";

const pick = (table: [number, number][], v: number) =>
  (table.find(([limit]) => v <= limit) ?? table[table.length - 1])[1];

export const ROUTES: Route[] = ["klaipeda", "poti"];
export const ROUTE_NAME: Record<Route, string> = { klaipeda: "Клайпеда", poti: "Поти" };
const ROUTE_PORT: Record<Route, string> = { klaipeda: "до Клайпеды (Литва)", poti: "до Поти (Грузия)" };

/** Оба маршрута сразу: { klaipeda, poti }. */
export function calcRoutes(i: CalcInput, country: Country, T: Tariffs = DEFAULT_TARIFFS): Record<Route, CalcResult> {
  return { klaipeda: calcTurnkey(i, country, T, "klaipeda"), poti: calcTurnkey(i, country, T, "poti") };
}

/** Самый дешёвый маршрут — для цены «от» на карточке. */
export function cheapest(i: CalcInput, country: Country, T: Tariffs = DEFAULT_TARIFFS): CalcResult {
  const r = calcRoutes(i, country, T);
  return r.poti.total < r.klaipeda.total ? r.poti : r.klaipeda;
}

/** Расчёт стоимости «под ключ» для авто 3–5 лет по одному маршруту. */
export function calcTurnkey(i: CalcInput, country: Country, T: Tariffs = DEFAULT_TARIFFS, route: Route = "klaipeda"): CalcResult {
  const price = Math.max(0, Number(i.price) || 0);
  const cc = Math.max(0, Number(i.cc) || 0);
  const hp = Math.max(0, Number(i.hp) || 0);
  const fee = pick(T.fees, price);
  const zone = stateInfo(String(i.state)).zone;
  const inland = T.inland[String(i.state).toUpperCase()] ?? T.inland[zone] ?? 450;
  const poti = route === "poti";
  const ocean = poti ? T.oceanPoti : T.ocean;
  const land = poti ? (country === "by" ? T.landPotiBy : T.landPotiRu) : (country === "by" ? T.landBy : T.landRu);
  const days = poti ? (country === "by" ? T.daysPotiBy : T.daysPotiRu) : (country === "by" ? T.daysKlaipedaBy : T.daysKlaipedaRu);
  const customsValue = price + fee + inland + ocean;

  let duty: number;
  let dutyNote: string;
  if (i.fuel === "Электро") {
    if (country === "by") {
      duty = 0;
      dutyNote = "электромобиль: пошлина 0";
    } else {
      const d = (customsValue * T.evRuPct) / 100;
      duty = d + (customsValue + d) * 0.2;
      dutyNote = `${T.evRuPct}% + НДС 20%`;
    }
  } else {
    const rate = pick(T.ccRates, cc);
    duty = rate * cc * T.eurUsd;
    dutyNote = `€${rate} × ${cc.toLocaleString("ru-RU")} см³, авто 3–5 лет`;
  }

  let util: number;
  let utilNote: string;
  if (country === "by") {
    util = T.utilBy / T.byn;
    utilNote = `${T.utilBy.toLocaleString("ru-RU")} BYN`;
  } else {
    const high = hp > 160;
    const rub = high ? T.utilRuHigh : T.utilRuLow;
    util = rub / T.rub;
    utilNote = `${rub.toLocaleString("ru-RU")} ₽, ${high ? "больше 160 л.с." : "до 160 л.с."}`;
  }

  const broker = country === "by" ? T.brokerBy : T.brokerRu;
  const st = stateInfo(String(i.state));

  const lines = [
    { label: "Ставка на аукционе", usd: price, note: i.auction || "Copart / IAAI / Manheim" },
    { label: "Сбор аукциона", usd: fee, note: "по шкале от цены лота" },
    { label: "Доставка по США", usd: inland, note: `${st.name} → порт ${st.port}` },
    { label: "Морской фрахт", usd: ocean, note: `контейнер ${ROUTE_PORT[route]}` },
    { label: `${ROUTE_NAME[route]} → ${country === "by" ? "Минск" : "Москва"}`, usd: land, note: "автовоз" },
    { label: "Таможенная пошлина", usd: duty, note: dutyNote },
    { label: "Утилизационный сбор", usd: util, note: utilNote },
    { label: "Брокер, СВХ, оформление", usd: broker, note: country === "by" ? "таможня РБ" : "таможня РФ" },
    { label: "Услуги компании", usd: T.service, note: "фиксированно" },
  ];
  const total = lines.reduce((s, l) => s + l.usd, 0);
  return {
    lines,
    total,
    local: country === "by" ? total * T.byn : total * T.rub,
    currency: country === "by" ? "BYN" : "₽",
    days: `≈ ${days} дней`,
    route,
    routeName: ROUTE_NAME[route],
  };
}

export { ageAtCustoms, isPassable } from "./age";
