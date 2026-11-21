import type { Tariffs } from "./types";
import { DEFAULT_TARIFFS } from "./tariffs";

/** Поля тарифов, которые владелец редактирует в кабинете (курсы — отдельно). */
export type EditableTariffs = Omit<Tariffs, "rub" | "byn" | "eurUsd">;

export const LAST = Number.MAX_SAFE_INTEGER; // «и выше» в таблицах

const SCALARS: { key: keyof EditableTariffs; label: string; min: number; max: number }[] = [
  { key: "service", label: "Услуги компании", min: 0, max: 100_000 },
  { key: "ocean", label: "Морской фрахт", min: 0, max: 50_000 },
  { key: "landBy", label: "Клайпеда → Минск", min: 0, max: 20_000 },
  { key: "landRu", label: "Клайпеда → Москва", min: 0, max: 20_000 },
  { key: "oceanPoti", label: "Морской фрахт до Поти", min: 0, max: 50_000 },
  { key: "landPotiBy", label: "Поти → Минск", min: 0, max: 20_000 },
  { key: "landPotiRu", label: "Поти → Москва", min: 0, max: 20_000 },
  { key: "daysKlaipedaBy", label: "Срок через Клайпеду в РБ, дней", min: 10, max: 365 },
  { key: "daysKlaipedaRu", label: "Срок через Клайпеду в РФ, дней", min: 10, max: 365 },
  { key: "daysPotiBy", label: "Срок через Поти в РБ, дней", min: 10, max: 365 },
  { key: "daysPotiRu", label: "Срок через Поти в РФ, дней", min: 10, max: 365 },
  { key: "brokerBy", label: "Брокер/СВХ РБ", min: 0, max: 20_000 },
  { key: "brokerRu", label: "Брокер/СВХ РФ", min: 0, max: 20_000 },
  { key: "utilBy", label: "Утильсбор РБ", min: 0, max: 1_000_000 },
  { key: "utilRuLow", label: "Утильсбор РФ до 160 л.с.", min: 0, max: 50_000_000 },
  { key: "utilRuHigh", label: "Утильсбор РФ свыше 160 л.с.", min: 0, max: 50_000_000 },
  { key: "evRuPct", label: "Пошлина на электромобили РФ, %", min: 0, max: 100 },
  { key: "deliveryDays", label: "Срок от торгов до растаможки, дней", min: 10, max: 365 },
];

function table(name: string, rows: unknown, maxVal: number, errors: string[]): [number, number][] {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 20) {
    errors.push(`${name}: нужна таблица от 1 до 20 строк`);
    return [];
  }
  const out: [number, number][] = [];
  rows.forEach((r, i) => {
    const last = i === rows.length - 1;
    const lim = last ? LAST : Number((r as unknown[])?.[0]);
    const val = Number((r as unknown[])?.[1]);
    if (!last && (!Number.isFinite(lim) || lim <= 0)) errors.push(`${name}, строка ${i + 1}: граница должна быть больше нуля`);
    if (!Number.isFinite(val) || val < 0 || val > maxVal) errors.push(`${name}, строка ${i + 1}: значение должно быть от 0 до ${maxVal}`);
    if (i > 0 && !last && lim <= out[i - 1][0]) errors.push(`${name}, строка ${i + 1}: границы должны идти по возрастанию`);
    out.push([lim, val]);
  });
  return out;
}

/** Проверяет и нормализует тарифы. Пустые/отсутствующие поля берутся из текущих значений. */
export function validateTariffs(input: Partial<EditableTariffs>, current: EditableTariffs = DEFAULT_TARIFFS):
  { ok: true; value: EditableTariffs } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const v = { ...current } as EditableTariffs;
  for (const s of SCALARS) {
    if (input[s.key] === undefined) continue;
    const n = Number(input[s.key]);
    if (!Number.isFinite(n) || n < s.min || n > s.max) errors.push(`${s.label}: введите число от ${s.min} до ${s.max.toLocaleString("ru-RU")}`);
    else (v as unknown as Record<string, number>)[s.key] = s.key === "deliveryDays" ? Math.round(n) : n;
  }
  if (input.inland !== undefined) {
    const inl: Record<string, number> = {};
    for (const [k, raw] of Object.entries(input.inland || {})) {
      const n = Number(raw);
      if (!/^[A-Z]{2}$/.test(k)) continue;
      if (!Number.isFinite(n) || n < 0 || n > 20_000) errors.push(`Доставка по США (${k}): число от 0 до 20 000`);
      else inl[k] = n;
    }
    v.inland = { ...current.inland, ...inl };
  }
  if (input.fees !== undefined) v.fees = table("Сбор аукциона", input.fees, 50_000, errors);
  if (input.ccRates !== undefined) v.ccRates = table("Пошлина €/см³", input.ccRates, 100, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: v };
}

/** Какие поля поменялись — для истории изменений. */
export function changedKeys(a: EditableTariffs, b: EditableTariffs): string[] {
  return (Object.keys(b) as (keyof EditableTariffs)[]).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
}
