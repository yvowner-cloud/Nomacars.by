import { dbConfigured, q, q1 } from "./db";
import { slugify } from "../lots";
import type { ImportCheck, ImportedLot } from "../lot-import";
import type { DamageZone, Lot } from "../types";

/** Каталог лотов — только реальные лоты из таблицы lots (наполняется загрузкой подборок). */
interface Row {
  id: number; auction: string; lot_number: string; slug: string; data: ImportedLot; score: number;
  sale_at: string | null; status: string; sold_price: number | null; visible: boolean; created_at: string;
}

const TOP_COUNT = 12;
let cache: { at: number; lots: Lot[] } | null = null;
export const invalidateCatalog = () => { cache = null; };

const COLORS: Record<string, string> = {
  black: "#1c1f24", white: "#ededed", silver: "#b8bec6", gray: "#6e7d8c", grey: "#6e7d8c", red: "#9e1b22", blue: "#2e3e57",
  green: "#3f5e4a", brown: "#5b4636", beige: "#cbbd9f", gold: "#b8963e", orange: "#c8642e", yellow: "#d8b437", purple: "#5a3d6b", maroon: "#6b1e26",
};
const colorHex = (name?: string | null) => {
  const k = String(name || "").toLowerCase();
  return Object.entries(COLORS).find(([c]) => k.includes(c))?.[1] ?? "#8d9299";
};
const zoneOf = (d: string): DamageZone => {
  const s = d.toLowerCase();
  if (/hail/.test(s)) return "hail";
  if (/rear/.test(s)) return "rear";
  if (/side|door|left|right/.test(s)) return "side";
  return "front";
};

/** Перевод строки базы в лот сайта. */
export function rowToLot(r: Row, now = Date.now()): Lot {
  const d = r.data;
  const [y, m] = String(d.manufactured || "").split("-").map(Number);
  const monthKnown = Boolean(d.manufactured && y && m >= 1 && m <= 12);
  const saleAt = r.sale_at ? new Date(r.sale_at).toISOString() : new Date(now).toISOString();
  let status = r.status as Lot["status"];
  if (status === "active" && r.sale_at && Date.parse(r.sale_at) < now - 12 * 3_600_000) status = "ended";
  // мощность не указана — оцениваем осторожно (для РФ важна граница 160 л.с.)
  const hpEstimated = d.hp === null || d.hp === undefined;
  const hp = hpEstimated ? (d.fuel === "Электро" ? 200 : d.engine_cc >= 2000 ? 180 : 140) : d.hp!;
  const noDamage = /^(none|no damage|normal wear|без повреждений)$/i.test(String(d.primary_damage || "").trim());
  const damage = noDamage ? "Без повреждений" : [d.primary_damage, d.secondary_damage].filter(Boolean).join(", ");
  return {
    id: r.id, slug: r.slug, make: d.make, model: d.model, trim: d.trim || "", year: d.year,
    month: monthKnown ? m : 1, monthKnown, body: d.body, fuel: d.fuel, cc: d.engine_cc, hp, hpEstimated,
    miles: d.odometer_miles ?? 0, damage, zone: zoneOf(damage), level: d.damage_level,
    price: status === "sold" && r.sold_price ? Number(r.sold_price) : d.current_bid_usd ?? d.buy_now_usd ?? 0,
    auction: d.auction, state: (d.location_state || "NJ").toUpperCase(), aiScore: r.score,
    repair: d.repair_estimate_usd ?? [0, 0], market: { by: 0, ru: 0 }, saleAt,
    color: colorHex(d.color), top: false, status, lotNo: d.lot_number,
    vin: d.vin && !d.vin_masked ? d.vin : d.vin ? `${d.vin.slice(0, 11)}••••••` : "скрыт аукционом",
    photos: d.photos, conditionGrade: d.condition_grade ?? null,
    review: d.summary_ru ? { summary: d.summary_ru, plain: d.damage_plain_ru, why: d.why_ru, risks: d.risks_ru } : undefined,
    extra: {
      city: d.location_city, title: d.title, runAndDrive: d.run_and_drive, keys: d.keys, airbags: d.airbags_deployed,
      colorName: d.color, drive: d.drive, transmission: d.transmission, engine: d.engine, odometerStatus: d.odometer_status,
      secondaryDamage: d.secondary_damage, url: d.url,
    },
  };
}

const markTop = (lots: Lot[]) => {
  const ids = new Set(lots.filter((l) => l.status === "active").sort((a, b) => b.aiScore - a.aiScore).slice(0, TOP_COUNT).map((l) => l.id));
  return lots.map((l) => ({ ...l, top: ids.has(l.id) }));
};

/** Лоты для сайта (видимые). Кеш 20 секунд. */
export async function getCatalog(): Promise<{ lots: Lot[] }> {
  if (cache && Date.now() - cache.at < 20_000) return cache;
  let lots: Lot[] = [];
  if (dbConfigured()) {
    try {
      const rows = await q<Row>(`select id, auction, lot_number, slug, data, score, sale_at, status, sold_price::float8 as sold_price, visible, created_at
        from lots where visible and status <> 'removed' order by score desc`);
      lots = rows.map((r) => rowToLot(r));
    } catch (e) { console.error("[catalog]", (e as Error).message); }
  }
  cache = { at: Date.now(), lots: markTop(lots) };
  return cache;
}

/** Любой лот по id — в том числе скрытый (для заявок, счетов, кабинета). */
export async function lotById(id: number | null | undefined): Promise<Lot | null> {
  if (!id) return null;
  const fromCatalog = (await getCatalog()).lots.find((l) => l.id === id);
  if (fromCatalog) return fromCatalog;
  if (!dbConfigured()) return null;
  const r = await q1<Row>(`select id, auction, lot_number, slug, data, score, sale_at, status, sold_price::float8 as sold_price, visible, created_at from lots where id=$1`, [id]).catch(() => null);
  return r ? rowToLot(r) : null;
}

export async function lotsByIds(ids: (number | null)[]): Promise<Map<number, Lot>> {
  const out = new Map<number, Lot>();
  for (const id of new Set(ids.filter((x): x is number => Boolean(x)))) {
    const l = await lotById(id);
    if (l) out.set(id, l);
  }
  return out;
}

// ---------- публикация подборок ----------
export async function publishImport(importId: number): Promise<{ added: number; updated: number }> {
  const row = await q1<{ checked: ImportCheck }>("select checked from lot_imports where id=$1", [importId]);
  if (!row) return { added: 0, updated: 0 };
  let added = 0, updated = 0;
  for (const c of row.checked.lots) {
    const d = c.lot;
    if (!d) continue;
    const saleAt = d.sale_date && !Number.isNaN(Date.parse(d.sale_date)) ? new Date(d.sale_date).toISOString() : null;
    const ex = await q1<{ id: number; status: string }>("select id, status from lots where auction=$1 and lot_number=$2", [d.auction, d.lot_number]);
    if (ex) {
      // повторная загрузка: обновляем данные; лот с новой датой торгов снова «активен»
      const reactivate = ex.status === "ended" && saleAt && Date.parse(saleAt) > Date.now();
      await q(`update lots set data=$2, score=$3, sale_at=$4, import_id=$5, updated_at=now() ${reactivate ? ", status='active'" : ""} where id=$1`,
        [ex.id, JSON.stringify(d), d.score, saleAt, importId]);
      updated++;
    } else {
      const ins = await q1<{ id: number }>(
        `insert into lots (auction, lot_number, slug, data, score, sale_at, import_id) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
        [d.auction, d.lot_number, `tmp-${d.auction}-${d.lot_number}`, JSON.stringify(d), d.score, saleAt, importId]);
      await q("update lots set slug=$2 where id=$1", [ins!.id, `${slugify(`${d.make}-${d.model}-${d.year}`)}-${ins!.id}`]);
      added++;
    }
  }
  invalidateCatalog();
  return { added, updated };
}

/** При первом запуске с таблицей lots — опубликовать все ранее загруженные подборки. */
export async function publishExistingImportsOnce() {
  const n = await q1<{ n: number }>("select count(*)::int as n from lots");
  if ((n?.n ?? 0) > 0) return;
  const imports = await q<{ id: number }>("select id::int from lot_imports order by id");
  for (const i of imports) {
    const r = await publishImport(i.id);
    console.log(`[catalog] подборка №${i.id} опубликована: новых ${r.added}, обновлено ${r.updated}`);
  }
}

// ---------- управление из кабинета ----------
export async function adminLots() {
  const rows = await q<Row>(`select id, auction, lot_number, slug, data, score, sale_at, status, sold_price::float8 as sold_price, visible, created_at
    from lots order by (status='active') desc, sale_at nulls last, score desc limit 1000`);
  return rows.map((r) => ({
    id: r.id, slug: r.slug, auction: r.auction, lotNumber: r.lot_number, title: `${r.data.year} ${r.data.make} ${r.data.model} ${r.data.trim || ""}`.trim(),
    photo: r.data.photos?.[0] ?? null, score: r.score, saleAt: r.sale_at, status: rowToLot(r).status, dbStatus: r.status,
    soldPrice: r.sold_price, visible: r.visible, bid: r.data.current_bid_usd, url: r.data.url,
    damage: r.data.primary_damage, state: r.data.location_state,
  }));
}

export async function updateLotAdmin(id: number, patch: { visible?: boolean; status?: string; soldPrice?: unknown }) {
  if (patch.visible !== undefined) await q("update lots set visible=$2, updated_at=now() where id=$1", [id, Boolean(patch.visible)]);
  if (patch.status !== undefined) {
    if (!["active", "sold", "ended", "removed"].includes(patch.status)) throw new Error("Неизвестный статус");
    await q("update lots set status=$2, updated_at=now() where id=$1", [id, patch.status]);
  }
  if (patch.soldPrice !== undefined) {
    const n = patch.soldPrice === null || patch.soldPrice === "" ? null : Number(String(patch.soldPrice).replace(/[\s$,]/g, ""));
    if (n !== null && (!Number.isFinite(n) || n <= 0 || n > 1_000_000)) throw new Error("Цена выкупа: число от 1 до 1 000 000");
    await q("update lots set sold_price=$2, status=case when $2::numeric is not null then 'sold' else status end, updated_at=now() where id=$1", [id, n]);
  }
  invalidateCatalog();
}
