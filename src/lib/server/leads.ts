import { q, q1 } from "./db";
import { AuthError, type User } from "./auth";
import { lotTitle } from "../lots";
import { getCatalog, lotById } from "./catalog";
import { q as dbq } from "./db";
import { calcTurnkey } from "../calc";
import { getTariffs } from "./settings";
import { notify, tgEscape as e } from "./telegram";
import { CLOSED, isLeadStatus, KIND_LABEL, statusLabel, type LeadStatus } from "../lead-status";
import type { CalcInput, CalcResult, Country } from "../types";
import { money } from "../format";
import { docsOf, invoicesOf } from "./billing";

export interface LeadRow {
  id: number; user_id: number | null; kind: "lot" | "pick" | "calc"; lot_id: number | null; status: LeadStatus;
  country: Country; name: string; phone: string; max_bid: number | null; budget: number | null; comment: string;
  calc: { input?: CalcInput; result?: CalcResult; poti?: CalcResult } | null; notes: string; tg_notified: boolean; created_at: string; updated_at: string;
}
export interface LeadEvent { id: number; type: string; from_status: string | null; to_status: string | null; text: string | null; created_at: string; who: string | null }

const COLS = `id::int, user_id::int, kind, lot_id, status, country, name, phone, max_bid::float8 as max_bid, budget::float8 as budget,
  comment, calc, notes, tg_notified, created_at, updated_at`;

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
const money0 = (v: unknown, max: number) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > max) throw new AuthError(`Сумма должна быть от 0 до ${max.toLocaleString("ru-RU")}`);
  return Math.round(n);
};

export interface NewLead {
  kind: "lot" | "pick" | "calc";
  lotId?: number; maxBid?: unknown; budget?: unknown; comment?: string;
  calcInput?: Partial<CalcInput>;
}

/** Создать заявку. Повторная заявка на тот же лот (пока прошлая не закрыта) возвращает существующую. */
/** Кто оставляет заявку: вошедший пользователь или гость при открытом доступе (id = null, телефон из формы). */
export interface LeadAuthor { id: number | null; name: string; phone: string }

export async function createLead(user: LeadAuthor, country: Country, input: NewLead): Promise<{ lead: LeadRow; existing: boolean }> {
  const recent = user.id !== null
    ? await q1<{ n: number }>("select count(*)::int as n from leads where user_id=$1 and created_at > now() - interval '1 hour'", [user.id])
    : await q1<{ n: number }>("select count(*)::int as n from leads where user_id is null and phone=$1 and created_at > now() - interval '1 hour'", [user.phone]);
  if ((recent?.n ?? 0) >= 10) throw new AuthError("Слишком много заявок за час. Мы уже работаем с вашими запросами — свяжемся в ближайшее время.", 429);

  const T = await getTariffs();
  let calc: LeadRow["calc"] = null;
  let lotId: number | null = null;
  if (input.kind === "lot") {
    const lot = await lotById(Number(input.lotId));
    if (!lot || lot.status !== "active") throw new AuthError("Торги по этому лоту уже прошли. Посмотрите другие машины в каталоге.", 404);
    lotId = lot.id;
    calc = { result: calcTurnkey(lot, country, T), poti: calcTurnkey(lot, country, T, "poti") };
    const ex = await activeLotLead(user, lotId);
    if (ex) return { lead: ex, existing: true };
  } else if (input.kind === "calc") {
    const i = input.calcInput || {};
    const ci: CalcInput = {
      price: Math.min(Math.max(Number(i.price) || 0, 0), 1_000_000), auction: clip(i.auction || "Copart", 20), state: clip(i.state || "NJ", 4),
      fuel: clip(i.fuel || "Бензин", 20), cc: Math.min(Math.max(Number(i.cc) || 0, 0), 10_000), hp: Math.min(Math.max(Number(i.hp) || 0, 0), 2_000),
      size: i.size === "suv" || i.size === "big" ? i.size : "sedan",
    };
    calc = { input: ci, result: calcTurnkey(ci, country, T), poti: calcTurnkey(ci, country, T, "poti") };
  } else if (input.kind !== "pick") {
    throw new AuthError("Неизвестный тип заявки");
  }

  const lead = await q1<LeadRow>(
    `insert into leads (user_id, kind, lot_id, country, name, phone, max_bid, budget, comment, calc)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict do nothing
     returning ${COLS}`,
    [user.id, input.kind, lotId, country, user.name, user.phone, money0(input.maxBid, 1_000_000), money0(input.budget, 1_000_000), clip(input.comment, 1000), calc ? JSON.stringify(calc) : null]);
  if (!lead) {
    // гонка двух одинаковых запросов — вернуть уже созданную
    const ex = lotId !== null ? await activeLotLead(user, lotId) : null;
    if (ex) return { lead: ex, existing: true };
    throw new AuthError("Не удалось создать заявку", 500);
  }
  await q("insert into lead_events (lead_id, user_id, type, to_status) values ($1, $2, 'created', 'new')", [lead.id, user.id]);

  // уведомление — в фоне, заявка уже сохранена
  void sendLeadNotification(lead)
    .then(async (ok) => { if (ok) await q("update leads set tg_notified=true where id=$1", [lead.id]); })
    .catch((err) => console.error("[leads] уведомление:", (err as Error).message));
  return { lead, existing: false };
}

/** Незакрытая заявка этого человека на этот лот (вошедший — по аккаунту, гость — по телефону). */
async function activeLotLead(user: LeadAuthor, lotId: number) {
  return user.id !== null
    ? q1<LeadRow>(`select ${COLS} from leads where user_id=$1 and lot_id=$2 and kind='lot' and status not in ('delivered','rejected')`, [user.id, lotId])
    : q1<LeadRow>(`select ${COLS} from leads where user_id is null and phone=$1 and lot_id=$2 and kind='lot' and status not in ('delivered','rejected')`, [user.phone, lotId]);
}

async function sendLeadNotification(l: LeadRow): Promise<boolean> {
  const lot = await lotById(l.lot_id);
  const site = process.env.SITE_URL || "https://ncars.by";
  const lines = [
    `<b>Новая заявка №${l.id}</b> · ${KIND_LABEL[l.kind]}`,
    `${e(l.name || "Без имени")}, ${e(l.phone)} (${l.country === "by" ? "РБ" : "РФ"})`,
  ];
  if (lot) lines.push(`${e(lotTitle(lot))} ${e(lot.trim)} — ${lot.auction} ${lot.lotNo}`);
  if (l.max_bid) lines.push(`Макс. ставка: ${money(l.max_bid)}`);
  if (l.budget) lines.push(`Бюджет под ключ: ${money(l.budget)}`);
  if (l.calc?.result) lines.push(`Под ключ (${l.country === "by" ? "РБ" : "РФ"}): ${money(l.calc.result.total)}`);
  if (l.calc?.input) lines.push(`Расчёт: ставка ${money(l.calc.input.price)}, ${l.calc.input.cc} см³, ${l.calc.input.hp} л.с., ${e(String(l.calc.input.fuel))}`);
  if (l.comment) lines.push(`Комментарий: ${e(l.comment)}`);
  lines.push(`${site}/admin?tab=leads&lead=${l.id}`);
  return notify(lines);
}

export async function myLeads(userId: number): Promise<LeadRow[]> {
  return q<LeadRow>(`select ${COLS} from leads where user_id=$1 order by created_at desc limit 50`, [userId]);
}

export async function listLeads(opts: { status?: string; q?: string; limit?: number }) {
  const where: string[] = [];
  const p: unknown[] = [];
  if (opts.status === "open") where.push(`status not in ('delivered','rejected')`);
  else if (opts.status && isLeadStatus(opts.status)) { p.push(opts.status); where.push(`status = $${p.length}`); }
  if (opts.q?.trim()) {
    const term = opts.q.trim();
    const digits = term.replace(/\D/g, "");
    const t = term.toLowerCase();
    const lotIds = (await getCatalog()).lots.filter((l) => `${l.year} ${l.make} ${l.model} ${l.lotNo}`.toLowerCase().includes(t)).map((l) => l.id);
    const hidden = await dbq<{ id: number }>("select id from lots where lower(data->>'make' || ' ' || (data->>'model') || ' ' || lot_number) like $1", [`%${t}%`]).catch(() => []);
    lotIds.push(...hidden.map((h) => h.id));
    const ors: string[] = [];
    p.push(`%${term}%`); ors.push(`name ilike $${p.length}`, `comment ilike $${p.length}`, `notes ilike $${p.length}`);
    if (digits.length >= 3) { p.push(`%${digits}%`); ors.push(`regexp_replace(phone, '\\D', '', 'g') like $${p.length}`); }
    if (/^\d+$/.test(term)) { p.push(Number(term)); ors.push(`id = $${p.length}`); }
    if (lotIds.length) { p.push(lotIds); ors.push(`lot_id = any($${p.length})`); }
    where.push(`(${ors.join(" or ")})`);
  }
  p.push(Math.min(opts.limit ?? 200, 500));
  const rows = await q<LeadRow>(`select ${COLS} from leads ${where.length ? "where " + where.join(" and ") : ""} order by (status='new') desc, created_at desc limit $${p.length}`, p);
  const counts = await q<{ status: string; n: number }>("select status, count(*)::int as n from leads group by status");
  return { rows, counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number> };
}

export async function getLead(id: number) {
  const lead = await q1<LeadRow>(`select ${COLS} from leads where id=$1`, [id]);
  if (!lead) throw new AuthError("Заявка не найдена", 404);
  const events = await q<LeadEvent>(
    `select e.id::int, e.type, e.from_status, e.to_status, e.text, e.created_at, coalesce(nullif(u.name,''), u.phone) as who
     from lead_events e left join users u on u.id = e.user_id where e.lead_id=$1 order by e.created_at`, [id]);
  const [invoices, docs] = await Promise.all([invoicesOf([id]), docsOf([id])]);
  return { lead, events, invoices, docs };
}

export async function updateLead(id: number, by: User, patch: { status?: string; notes?: string }) {
  const { lead } = await getLead(id);
  if (patch.status !== undefined) {
    if (!isLeadStatus(patch.status)) throw new AuthError("Неизвестный статус");
    if (patch.status !== lead.status) {
      await q("update leads set status=$2, updated_at=now() where id=$1", [id, patch.status]);
      await q("insert into lead_events (lead_id, user_id, type, from_status, to_status) values ($1,$2,'status',$3,$4)", [id, by.id, lead.status, patch.status]);
    }
  }
  if (patch.notes !== undefined) {
    const notes = clip(patch.notes, 5000);
    if (notes !== lead.notes) {
      await q("update leads set notes=$2, updated_at=now() where id=$1", [id, notes]);
      await q("insert into lead_events (lead_id, user_id, type, text) values ($1,$2,'note',$3)", [id, by.id, notes.slice(0, 200)]);
    }
  }
  return getLead(id);
}

export async function newLeadsCount(): Promise<number> {
  return (await q1<{ n: number }>("select count(*)::int as n from leads where status='new'"))?.n ?? 0;
}

export { CLOSED, statusLabel };
