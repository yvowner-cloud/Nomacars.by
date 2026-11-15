import type { Tariffs } from "../types";
import { DEFAULT_TARIFFS } from "../tariffs";
import { changedKeys, validateTariffs, type EditableTariffs } from "../tariff-validate";
import { dbConfigured, q, q1 } from "./db";
import { fetchFx, type FxRates } from "./fx";

/**
 * Тарифы и курсы хранятся в таблице settings:
 *   tariffs — всё, что редактирует владелец (сборы, доставка, пошлины, комиссия, срок)
 *   fx      — курсы: auto (с НБРБ/ЦБ РФ) + manual (ручные, имеют приоритет)
 * getTariffs() отдаёт итоговые тарифы для расчётов (кеш 30 секунд).
 */
export interface FxState {
  auto: FxRates | null;
  fetchedAt: string | null;
  error: string | null;
  manual: Partial<Record<keyof FxRates, number | null>>;
}
const EMPTY_FX: FxState = { auto: null, fetchedAt: null, error: null, manual: {} };

let cache: { at: number; value: Tariffs } | null = null;
const TTL = 30_000;
export const invalidateTariffs = () => { cache = null; };

async function read<T>(key: string): Promise<T | null> {
  const r = await q1<{ value: T }>("select value from settings where key=$1", [key]);
  return r?.value ?? null;
}

async function write(key: string, value: unknown, userId: number | null, changed: string[]) {
  const before = await read(key);
  await q(`insert into settings (key, value, updated_at, updated_by) values ($1, $2, now(), $3)
           on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`,
    [key, JSON.stringify(value), userId]);
  if (changed.length) {
    await q("insert into settings_history (key, before, after, changed, user_id) values ($1, $2, $3, $4, $5)",
      [key, before === null ? null : JSON.stringify(before), JSON.stringify(value), changed, userId]);
  }
  invalidateTariffs();
}

export async function editableTariffs(): Promise<EditableTariffs> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { rub, byn, eurUsd, ...defaults } = DEFAULT_TARIFFS;
  if (!dbConfigured()) return defaults;
  const stored = await read<Partial<EditableTariffs>>("tariffs");
  return { ...defaults, ...(stored || {}), inland: { ...defaults.inland, ...(stored?.inland || {}) } };
}

export async function fxState(): Promise<FxState> {
  if (!dbConfigured()) return EMPTY_FX;
  return { ...EMPTY_FX, ...((await read<FxState>("fx")) || {}) };
}

/** Итоговый курс: ручной → автоматический → значение по умолчанию. */
export function effectiveRates(fx: FxState): FxRates & { source: Record<keyof FxRates, "manual" | "auto" | "default"> } {
  const pick = (k: keyof FxRates) => {
    const m = fx.manual?.[k];
    if (typeof m === "number" && m > 0) return { v: m, s: "manual" as const };
    const a = fx.auto?.[k];
    if (typeof a === "number" && a > 0) return { v: a, s: "auto" as const };
    return { v: DEFAULT_TARIFFS[k], s: "default" as const };
  };
  const byn = pick("byn"), rub = pick("rub"), eurUsd = pick("eurUsd");
  return { byn: byn.v, rub: rub.v, eurUsd: eurUsd.v, source: { byn: byn.s, rub: rub.s, eurUsd: eurUsd.s } };
}

/** Тарифы для расчётов (сайт работает и без базы — тогда стартовые значения). */
export async function getTariffs(): Promise<Tariffs> {
  if (!dbConfigured()) return DEFAULT_TARIFFS;
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  try {
    const [t, fx] = await Promise.all([editableTariffs(), fxState()]);
    const r = effectiveRates(fx);
    const value: Tariffs = { ...t, byn: r.byn, rub: r.rub, eurUsd: r.eurUsd };
    cache = { at: Date.now(), value };
    return value;
  } catch (e) {
    console.error("[tariffs] не удалось прочитать из базы:", (e as Error).message);
    return cache?.value ?? DEFAULT_TARIFFS;
  }
}

export async function saveTariffs(userId: number, input: Partial<EditableTariffs>) {
  const current = await editableTariffs();
  const r = validateTariffs(input, current);
  if (!r.ok) return r;
  const changed = changedKeys(current, r.value);
  if (changed.length) await write("tariffs", r.value, userId, changed);
  return { ok: true as const, value: r.value, changed };
}

export async function saveManualRates(userId: number, manual: FxState["manual"]) {
  const fx = await fxState();
  const clean: FxState["manual"] = {};
  const errors: string[] = [];
  const limits: Record<keyof FxRates, [number, number, string]> = { byn: [0.5, 50, "1 $ в BYN"], rub: [5, 1000, "1 $ в ₽"], eurUsd: [0.3, 3, "1 € в $"] };
  for (const k of Object.keys(limits) as (keyof FxRates)[]) {
    const raw = manual?.[k];
    if (raw === null || raw === undefined || (raw as unknown) === "") { clean[k] = null; continue; }
    const n = Number(raw);
    const [min, max, label] = limits[k];
    if (!Number.isFinite(n) || n < min || n > max) errors.push(`${label}: введите число от ${min} до ${max} или оставьте пустым`);
    else clean[k] = n;
  }
  if (errors.length) return { ok: false as const, errors };
  const changed = (Object.keys(limits) as (keyof FxRates)[]).filter((k) => (fx.manual?.[k] ?? null) !== (clean[k] ?? null)).map((k) => `manual.${k}`);
  await write("fx", { ...fx, manual: clean }, userId, changed);
  return { ok: true as const };
}

export async function refreshFx(): Promise<FxState> {
  const fx = await fxState();
  try {
    const auto = await fetchFx();
    const next: FxState = { ...fx, auto, fetchedAt: new Date().toISOString(), error: null };
    await write("fx", next, null, []);
    console.log(`[fx] курсы обновлены: 1$=${auto.byn} BYN, 1$=${auto.rub} ₽, 1€=${auto.eurUsd} $`);
    return next;
  } catch (e) {
    const msg = (e as Error).message;
    const human = /fetch failed|timeout|aborted|ENOTFOUND|ECONN/i.test(msg) ? "нет связи с сайтом банка" : msg;
    const when = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Minsk" });
    const next: FxState = { ...fx, error: `${when} — ${human}. Расчёты идут по последним известным курсам.` };
    await write("fx", next, null, []).catch(() => {});
    console.error("[fx] не удалось обновить курсы:", (e as Error).message);
    return next;
  }
}

export async function history(limit = 15) {
  if (!dbConfigured()) return [];
  return q<{ key: string; changed: string[]; changed_at: string; name: string | null; phone: string | null }>(
    `select h.key, h.changed, h.changed_at, u.name, u.phone from settings_history h
     left join users u on u.id = h.user_id order by h.changed_at desc limit $1`, [limit]);
}

/** Обновлять курсы при старте и каждые 4 часа (один процесс сайта на сервере). */
export function startFxScheduler() {
  const g = globalThis as unknown as { __ncFx?: NodeJS.Timeout };
  if (g.__ncFx) return;
  const tick = async () => {
    const fx = await fxState().catch(() => null);
    const age = fx?.fetchedAt ? Date.now() - Date.parse(fx.fetchedAt) : Infinity;
    if (age > 3.5 * 3_600_000) await refreshFx();
  };
  setTimeout(tick, 5_000);
  g.__ncFx = setInterval(tick, 30 * 60_000);
}
