/**
 * Проверка подборки лотов в формате _plans/prompt-podborka-test.md (criteria_version 1).
 * Работает и в браузере (предпросмотр), и на сервере (сохранение).
 */
export interface ImportedLot {
  auction: "Copart" | "IAAI" | "Manheim";
  lot_number: string;
  url: string | null;
  vin: string | null;
  vin_masked: boolean;
  year: number;
  manufactured: string | null;
  make: string;
  model: string;
  trim: string;
  body: "suv" | "sedan" | "other";
  color: string | null;
  fuel: "Бензин" | "Дизель" | "Гибрид" | "Электро";
  engine: string | null;
  engine_cc: number;
  hp: number | null;
  transmission: string | null;
  drive: string | null;
  odometer_miles: number | null;
  odometer_status: string | null;
  primary_damage: string;
  secondary_damage: string | null;
  title: string | null;
  title_state: string | null;
  run_and_drive: boolean | null;
  keys: boolean | null;
  airbags_deployed: boolean | null;
  location_city: string | null;
  location_state: string | null;
  sale_date: string | null;
  current_bid_usd: number | null;
  buy_now_usd: number | null;
  est_retail_value_usd: number | null;
  photos: string[];
  damage_level: "light" | "mid";
  score: number;
  repair_estimate_usd: [number, number] | null;
  condition_grade: number | null;
  announcements: string | null;
  summary_ru: string;
  damage_plain_ru: string;
  why_ru: string[];
  risks_ru: string[];
}

export interface LotCheck { index: number; key: string; lot: ImportedLot | null; errors: string[]; warnings: string[] }
export interface ImportCheck { ok: boolean; fatal: string | null; source: string; collectedAt: string | null; notes: string; lots: LotCheck[]; valid: number }

import { ageAtCustoms, DELIVERY_DAYS } from "./age";

const BAD_DAMAGE = /water|flood|fire|burn|biohazard|rollover|all over|undercarriage|frame|stripped|missing/i;
const BAD_TITLE = /junk|parts only|destruction|non.?repairable|scrap/i;
const FUELS = ["Бензин", "Дизель", "Гибрид", "Электро"];

const str = (v: unknown, max = 300): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[\s,$]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : null);
const strs = (v: unknown, max: number, len = 500): string[] =>
  Array.isArray(v) ? v.map((x) => str(x, len)).filter((x): x is string => Boolean(x)).slice(0, max) : [];

/** Принимает текст (JSON, можно с ```json-обёрткой) или уже разобранный объект. */
export function checkImport(input: unknown): ImportCheck {
  let data: unknown = input;
  if (typeof input === "string") {
    const text = input.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    try { data = JSON.parse(start >= 0 ? text.slice(start, end + 1) : text); }
    catch (e) { return { ok: false, fatal: `Это не похоже на JSON: ${(e as Error).message}`, source: "", collectedAt: null, notes: "", lots: [], valid: 0 }; }
  }
  const root = data as Record<string, unknown>;
  const raw = Array.isArray(root) ? root : root?.lots;
  if (!Array.isArray(raw)) return { ok: false, fatal: "Не найден список лотов (поле \"lots\")", source: "", collectedAt: null, notes: "", lots: [], valid: 0 };
  if (raw.length === 0) return { ok: false, fatal: "Список лотов пуст", source: "", collectedAt: null, notes: "", lots: [], valid: 0 };
  if (raw.length > 1000) return { ok: false, fatal: "Слишком много лотов за раз (максимум 1000)", source: "", collectedAt: null, notes: "", lots: [], valid: 0 };

  const seen = new Set<string>();
  const lots: LotCheck[] = raw.map((r, index) => {
    const x = (r || {}) as Record<string, unknown>;
    const errors: string[] = [];
    const warnings: string[] = [];
    const auctionRaw = String(x.auction || "").toLowerCase();
    const auction = auctionRaw.includes("copart") ? "Copart" : auctionRaw.includes("iaa") ? "IAAI" : auctionRaw.includes("manheim") ? "Manheim" : null;
    const lotNo = (auction === "Manheim" ? str(x.lot_number, 30)?.replace(/[^A-Za-z0-9-]/g, "") : str(x.lot_number, 30)?.replace(/\D/g, "")) || null;
    const key = `${auction ?? "?"}-${lotNo ?? index}`;
    if (!auction) errors.push("аукцион должен быть Copart, IAAI или Manheim");
    if (!lotNo) errors.push("нет номера лота");
    if (lotNo && seen.has(key)) errors.push("лот повторяется в подборке");
    seen.add(key);

    const year = num(x.year);
    if (!year || year < 2015 || year > 2030) errors.push("неверный год");
    const make = str(x.make, 40), model = str(x.model, 60);
    if (!make || !model) errors.push("нет марки или модели");
    const bodyRaw = String(x.body || "").toLowerCase();
    const body = bodyRaw === "suv" || bodyRaw === "sedan" ? bodyRaw : "other";
    if (body === "other") warnings.push("кузов не кроссовер и не седан");
    const fuel = FUELS.includes(String(x.fuel)) ? (String(x.fuel) as ImportedLot["fuel"]) : null;
    if (!fuel) errors.push("топливо: Бензин, Дизель, Гибрид или Электро");
    const cc = num(x.engine_cc);
    if (fuel && fuel !== "Электро" && (!cc || cc < 600 || cc > 8000)) errors.push("не указан объём двигателя (engine_cc)");
    const hp = num(x.hp);
    if (hp === null) warnings.push("мощность неизвестна — для РФ утильсбор посчитается приблизительно");

    const primary = str(x.primary_damage, 80) || (auction === "Manheim" ? "None" : null);
    if (!primary) errors.push("нет основного повреждения");
    const cgRaw = num(x.condition_grade);
    const cg = cgRaw === null ? null : cgRaw > 5 && cgRaw <= 50 ? cgRaw / 10 : cgRaw; // 42 → 4.2
    if (cg !== null && (cg < 0 || cg > 5)) errors.push("оценка состояния (condition_grade) должна быть от 0 до 5");
    if (auction === "Manheim" && cg === null) warnings.push("нет оценки состояния (CR)");
    if (auction === "Manheim" && cg !== null && cg < 3.5) warnings.push(`низкая оценка состояния: ${cg}`);
    const ann = str(x.announcements, 500);
    if (ann && /frame|structural|flood|salvage|rebuilt|tmu|odometer|lemon|buyback/i.test(ann)) errors.push(`исключающая отметка аукциона: ${ann}`);
    const secondary = str(x.secondary_damage, 80);
    if ((primary && BAD_DAMAGE.test(primary)) || (secondary && BAD_DAMAGE.test(secondary))) errors.push(`исключённое повреждение: ${[primary, secondary].filter(Boolean).join(", ")}`);
    const title = str(x.title, 80);
    if (title && BAD_TITLE.test(title)) errors.push(`документ не подходит: ${title}`);
    if (!title) warnings.push("тип документа (title) не указан");
    const rd = bool(x.run_and_drive);
    if (rd === false) warnings.push("не на ходу (Run and Drive = нет)");
    const odo = num(x.odometer_miles);
    if (odo !== null && odo > 60000) warnings.push(`большой пробег: ${odo} миль`);
    if (/not actual|exempt/i.test(String(x.odometer_status || ""))) warnings.push("пробег не подтверждён (Not Actual/Exempt)");
    const airbags = bool(x.airbags_deployed);
    if (airbags) warnings.push("сработали подушки безопасности");

    const sale = str(x.sale_date, 40);
    if (!sale || Number.isNaN(Date.parse(sale))) warnings.push("нет корректной даты торгов");
    else if (Date.parse(sale) < Date.now() - 86_400_000) warnings.push("торги уже прошли");
    // «Проходной» возраст: 3–5 лет на дату растаможки (торги + ~75 дней) — по дате производства, не по модельному году
    const mfd = str(x.manufactured, 10);
    const mm = mfd ? /^(\d{4})-(\d{1,2})$/.exec(mfd) : null;
    const saleTs = sale && !Number.isNaN(Date.parse(sale)) ? new Date(sale) : new Date();
    if (year && mm && +mm[2] >= 1 && +mm[2] <= 12) {
      const age = ageAtCustoms(+mm[1], +mm[2], saleTs, DELIVERY_DAYS);
      if (age < 3 || age > 5) errors.push(`непроходной возраст: ${age.toFixed(1).replace(".", ",")} г. на дату растаможки (нужно 3–5)`);
    } else if (year) {
      if (mfd) warnings.push(`дата производства «${mfd}» не в формате ГГГГ-ММ`);
      const lo = new Date(saleTs.getTime() + DELIVERY_DAYS * 86_400_000).getFullYear() - 5;
      if (year < lo || year > lo + 3) errors.push(`модельный год ${year} не подходит под 3–5 лет на дату растаможки`);
      else if (year === lo || year === lo + 2) warnings.push(`нет даты производства — у ${year} модельного года возраст может выйти за 3–5 лет, проверьте наклейку в проёме двери`);
    }
    const photos = strs(x.photos, 40).filter((u) => /^https:\/\//.test(u));
    if (photos.length === 0) errors.push("нет ссылок на фото");
    else if (photos.length < 5) warnings.push(`мало фото: ${photos.length}`);
    const dl = x.damage_level === "mid" ? "mid" : "light";
    const score = Math.max(0, Math.min(100, Math.round(num(x.score) ?? 0)));
    const rep = Array.isArray(x.repair_estimate_usd) ? x.repair_estimate_usd.map(num) : null;
    const summary = str(x.summary_ru, 1500) || "";
    if (summary.length < 20) warnings.push("нет описания (summary_ru)");
    if (/\bИИ\b/.test(summary + String(x.damage_plain_ru || ""))) warnings.push("в текстах встречается «ИИ» — на сайте так не пишем");
    const bid = num(x.current_bid_usd), erv = num(x.est_retail_value_usd);

    const lot: ImportedLot | null = errors.length ? null : {
      auction: auction!, lot_number: lotNo!, url: str(x.url, 300), vin: str(x.vin, 20), vin_masked: Boolean(x.vin_masked),
      year: year!, manufactured: str(x.manufactured, 10), make: make!, model: model!, trim: str(x.trim, 60) || "",
      body: body as ImportedLot["body"], color: str(x.color, 30), fuel: fuel!, engine: str(x.engine, 40),
      engine_cc: fuel === "Электро" ? 0 : Math.round(cc!), hp: hp === null ? null : Math.round(hp), transmission: str(x.transmission, 30),
      drive: str(x.drive, 20), odometer_miles: odo === null ? null : Math.round(odo), odometer_status: str(x.odometer_status, 30),
      primary_damage: primary!, secondary_damage: secondary, title, title_state: str(x.title_state, 4), run_and_drive: rd, keys: bool(x.keys),
      airbags_deployed: airbags, location_city: str(x.location_city, 60), location_state: str(x.location_state, 4)?.toUpperCase() ?? null,
      sale_date: sale, current_bid_usd: bid, buy_now_usd: num(x.buy_now_usd), est_retail_value_usd: erv,
      photos, damage_level: dl, score,
      repair_estimate_usd: rep && rep[0] !== null && rep[1] !== null ? [rep[0]!, rep[1]!] : null,
      condition_grade: cg, announcements: ann,
      summary_ru: summary, damage_plain_ru: str(x.damage_plain_ru, 1500) || "",
      why_ru: strs(x.why_ru, 6, 300), risks_ru: strs(x.risks_ru, 6, 300),
    };
    return { index, key, lot, errors, warnings };
  });

  const valid = lots.filter((l) => l.lot).length;
  return {
    ok: valid > 0, fatal: valid ? null : "Ни один лот не прошёл проверку",
    source: str(root?.source, 80) || "unknown", collectedAt: str(root?.collected_at, 40), notes: str(root?.notes, 2000) || "",
    lots, valid,
  };
}
