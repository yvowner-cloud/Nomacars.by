import type { CalcResult, Country, Lot, Route, Tariffs } from "../types";
import { calcRoutes, cheapest } from "../calc";
import type { User } from "./auth";

/**
 * Лот в том виде, в котором он уходит в браузер.
 * - Сравнение с рынком (market) не уходит никогда — это внутренние данные отбора.
 * - Цена под ключ и цена выкупа проданных лотов — вошедшим пользователям (или всем при открытом доступе).
 */
export type PublicLot = Omit<Lot, "market" | "price"> & {
  /** Текущая ставка (активные лоты) — публичная информация аукциона */
  bid: number | null;
  /** Цена выкупа проданного лота — только для вошедших */
  soldPrice: number | null;
  /** Итог под ключ для РБ и РФ — только для вошедших */
  turnkey: { by: number; ru: number } | null;
};

/** viewer — вошедший пользователь или true при открытом доступе (цены видны всем). */
export function toPublic(l: Lot, user: User | boolean | null, T: Tariffs): PublicLot {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { market, price, ...rest } = l;
  const authed = Boolean(user);
  return {
    ...rest,
    bid: l.status === "active" ? price : null,
    soldPrice: authed && l.status === "sold" ? price : null,
    // на карточке — цена «от»: самый дешёвый из маршрутов (Клайпеда / Поти)
    turnkey: authed && l.status === "active" ? { by: cheapest(l, "by", T).total, ru: cheapest(l, "ru", T).total } : null,
  };
}

export const toPublicAll = (lots: Lot[], user: User | boolean | null, T: Tariffs) => lots.map((l) => toPublic(l, user, T));

export type LotCalc = Record<Country, Record<Route, CalcResult>>;

/** Полный расчёт по строкам для страницы лота (оба маршрута) — только для вошедших. */
export function lotCalc(l: Lot, user: User | boolean | null, T: Tariffs): LotCalc | null {
  if (!user || l.status !== "active") return null;
  return { by: calcRoutes(l, "by", T), ru: calcRoutes(l, "ru", T) };
}
