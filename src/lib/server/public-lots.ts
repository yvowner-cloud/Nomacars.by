import type { CalcResult, Lot, Tariffs } from "../types";
import { calcTurnkey } from "../calc";
import type { User } from "./auth";

/**
 * Лот в том виде, в котором он уходит в браузер.
 * - Сравнение с рынком (market) не уходит никогда — это внутренние данные отбора.
 * - Цена под ключ и цена выкупа проданных лотов — только вошедшим пользователям.
 */
export type PublicLot = Omit<Lot, "market" | "price"> & {
  /** Текущая ставка (активные лоты) — публичная информация аукциона */
  bid: number | null;
  /** Цена выкупа проданного лота — только для вошедших */
  soldPrice: number | null;
  /** Итог под ключ для РБ и РФ — только для вошедших */
  turnkey: { by: number; ru: number } | null;
};

export function toPublic(l: Lot, user: User | null, T: Tariffs): PublicLot {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { market, price, ...rest } = l;
  const authed = Boolean(user);
  return {
    ...rest,
    bid: l.status === "active" ? price : null,
    soldPrice: authed && l.status === "sold" ? price : null,
    turnkey: authed && l.status === "active" ? { by: calcTurnkey(l, "by", T).total, ru: calcTurnkey(l, "ru", T).total } : null,
  };
}

export const toPublicAll = (lots: Lot[], user: User | null, T: Tariffs) => lots.map((l) => toPublic(l, user, T));

/** Полный расчёт по строкам для карточки лота — только для вошедших. */
export function lotCalc(l: Lot, user: User | null, T: Tariffs): { by: CalcResult; ru: CalcResult } | null {
  if (!user || l.status !== "active") return null;
  return { by: calcTurnkey(l, "by", T), ru: calcTurnkey(l, "ru", T) };
}
