import { api, body } from "@/lib/server/api";
import { AuthError, currentUser } from "@/lib/server/auth";
import { calcRoutes } from "@/lib/calc";
import { getTariffs } from "@/lib/server/settings";
import type { CalcInput, Country } from "@/lib/types";

/** Калькулятор под ключ — только для вошедших (тарифы не уходят в браузер). */
export const POST = api(async (req) => {
  if (!(await currentUser())) throw new AuthError("Войдите, чтобы увидеть расчёт", 401);
  const b = await body<{ input?: Partial<CalcInput>; country?: Country }>(req);
  const i = b.input || {};
  const input: CalcInput = {
    price: Math.min(Math.max(Number(i.price) || 0, 0), 1_000_000),
    auction: String(i.auction || "Copart").slice(0, 20),
    state: String(i.state || "NJ").slice(0, 4),
    fuel: String(i.fuel || "Бензин").slice(0, 20),
    cc: Math.min(Math.max(Number(i.cc) || 0, 0), 10_000),
    hp: Math.min(Math.max(Number(i.hp) || 0, 0), 2_000),
  };
  const country: Country = b.country === "ru" ? "ru" : "by";
  const T = await getTariffs();
  return { routes: calcRoutes(input, country, T), rates: { byn: T.byn, rub: T.rub, eurUsd: T.eurUsd }, deliveryDays: T.deliveryDays };
});
