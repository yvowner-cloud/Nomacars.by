import { q, q1 } from "./db";
import { getCatalog } from "./catalog";
import { matchModel } from "../model-match";
import { TIER_TARGET, type Tier } from "../model-seed";

/** Список моделей с покрытием: сколько активных лотов на сайте и сколько не хватает до цели. */
export interface ModelRow { id: number; make: string; model: string; tier: Tier; target: number; active: boolean; onSite: number; need: number }

export async function modelsWithCoverage(): Promise<{ rows: ModelRow[]; unmatched: { make: string; model: string; count: number }[] }> {
  const rows = await q<Omit<ModelRow, "onSite" | "need">>("select id, make, model, tier, target, active from model_targets order by make, tier, model");
  const { lots } = await getCatalog();
  const counts = new Map<number, number>();
  const unmatched = new Map<string, { make: string; model: string; count: number }>();
  for (const l of lots) {
    if (l.status !== "active") continue;
    const t = matchModel(l.make, l.model, rows);
    if (t) counts.set(t.id, (counts.get(t.id) ?? 0) + 1);
    else {
      const k = `${l.make}|${l.model}`;
      const u = unmatched.get(k) ?? { make: l.make, model: l.model, count: 0 };
      u.count++; unmatched.set(k, u);
    }
  }
  return {
    rows: rows.map((r) => {
      const onSite = counts.get(r.id) ?? 0;
      return { ...r, onSite, need: r.active ? Math.max(0, r.target - onSite) : 0 };
    }),
    unmatched: [...unmatched.values()].sort((a, b) => b.count - a.count),
  };
}

const clean = (s: unknown, n: number) => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, n);
const tierOf = (v: unknown): Tier => (v === "A" || v === "B" || v === "C" ? v : String(v || "").toUpperCase() === "A" ? "A" : String(v || "").toUpperCase() === "C" ? "C" : "B");

export async function upsertModel(input: { make?: unknown; model?: unknown; tier?: unknown; target?: unknown }) {
  const make = clean(input.make, 40), model = clean(input.model, 60);
  if (!make || !model) throw new Error("Укажите марку и модель");
  const tier = tierOf(input.tier);
  const t = input.target === undefined || input.target === "" ? TIER_TARGET[tier] : Number(input.target);
  if (!Number.isInteger(t) || t < 0 || t > 50) throw new Error("Цель — целое число от 0 до 50");
  const r = await q1<{ id: number }>(
    `insert into model_targets (make, model, tier, target) values ($1,$2,$3,$4)
     on conflict (lower(make), lower(model)) do update set tier = excluded.tier, target = excluded.target, active = true
     returning id`, [make, model, tier, t]);
  return r!.id;
}

/** Массовая вставка строк «Марка; Модель; Уровень; Цель» (уровень и цель необязательны). */
export async function bulkUpsert(text: string) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (lines.length > 500) throw new Error("Слишком много строк за раз (максимум 500)");
  const errors: string[] = [];
  let ok = 0;
  for (const [i, line] of lines.entries()) {
    const [make, model, tier, target] = line.split(/[;\t|]/).map((s) => s.trim());
    try { await upsertModel({ make, model, tier, target }); ok++; }
    catch (e) { errors.push(`Строка ${i + 1} «${line}»: ${(e as Error).message}`); }
  }
  return { ok, errors };
}

export async function updateModel(id: number, patch: { tier?: unknown; target?: unknown; active?: unknown }) {
  if (patch.tier !== undefined) await q("update model_targets set tier=$2 where id=$1", [id, tierOf(patch.tier)]);
  if (patch.target !== undefined) {
    const t = Number(patch.target);
    if (!Number.isInteger(t) || t < 0 || t > 50) throw new Error("Цель — целое число от 0 до 50");
    await q("update model_targets set target=$2 where id=$1", [id, t]);
  }
  if (patch.active !== undefined) await q("update model_targets set active=$2 where id=$1", [id, Boolean(patch.active)]);
}

export async function deleteModel(id: number) {
  await q("delete from model_targets where id=$1", [id]);
}
