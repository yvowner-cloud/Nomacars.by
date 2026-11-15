import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { q, q1 } from "./db";
import { AuthError, type User } from "./auth";
import { statusLabel } from "../lead-status";

/** Счета, документы, реквизиты компании и «новое для клиента». */

export interface Invoice { id: number; lead_id: number; title: string; amount: number; currency: string; paid_at: string | null; created_at: string }
export interface Doc { id: number; lead_id: number; name: string; mime: string; size: number; stage: string | null; created_at: string }

const INV = "id::int, lead_id::int, title, amount::float8 as amount, currency, paid_at, created_at";
const DOC = "id::int, lead_id::int, name, mime, size, stage, created_at";

const isStaff = (u: User) => u.role === "owner" || u.role === "manager";

/** Проверить, что пользователь — владелец заявки или сотрудник. */
export async function assertLeadAccess(user: User, leadId: number) {
  const l = await q1<{ user_id: number | null; status: string }>("select user_id::int, status from leads where id=$1", [leadId]);
  if (!l) throw new AuthError("Заявка не найдена", 404);
  if (!isStaff(user) && l.user_id !== user.id) throw new AuthError("Нет доступа", 403);
  return l;
}

const event = (leadId: number, userId: number, type: string, text: string) =>
  q("insert into lead_events (lead_id, user_id, type, text) values ($1,$2,$3,$4)", [leadId, userId, type, text.slice(0, 200)]);

// ---------- счета ----------
export async function invoicesOf(leadIds: number[]): Promise<Invoice[]> {
  if (!leadIds.length) return [];
  return q<Invoice>(`select ${INV} from invoices where lead_id = any($1) order by created_at`, [leadIds]);
}

export async function addInvoice(by: User, leadId: number, title: string, amount: unknown) {
  await assertLeadAccess(by, leadId);
  const t = String(title || "").trim().slice(0, 200);
  const a = Math.round(Number(String(amount).replace(/\s/g, "").replace(",", ".")) * 100) / 100;
  if (t.length < 3) throw new AuthError("Укажите назначение счёта");
  if (!Number.isFinite(a) || a <= 0 || a > 1_000_000) throw new AuthError("Сумма счёта: от 0,01 до 1 000 000 $");
  const inv = await q1<Invoice>(`insert into invoices (lead_id, title, amount, created_by) values ($1,$2,$3,$4) returning ${INV}`, [leadId, t, a, by.id]);
  await event(leadId, by.id, "invoice", `Счёт «${t}» на $ ${a.toLocaleString("ru-RU")}`);
  return inv!;
}

/** 4 стандартных счёта по снимку расчёта в заявке. */
export async function invoicesFromCalc(by: User, leadId: number) {
  await assertLeadAccess(by, leadId);
  const l = await q1<{ calc: { result?: { lines: { label: string; usd: number }[] } } | null }>("select calc from leads where id=$1", [leadId]);
  const lines = l?.calc?.result?.lines;
  if (!lines?.length) throw new AuthError("В заявке нет расчёта — выставьте счета вручную");
  const sum = (labels: string[]) => lines.filter((x) => labels.some((p) => x.label.startsWith(p))).reduce((s, x) => s + x.usd, 0);
  const groups: [string, number][] = [
    ["Оплата лота и аукционного сбора", sum(["Ставка", "Сбор аукциона"])],
    ["Доставка по США, морской фрахт и доставка до места", sum(["Доставка по США", "Морской фрахт", "Клайпеда"])],
    ["Таможенные платежи и оформление", sum(["Таможенная", "Утилизационный", "Брокер"])],
    ["Услуги компании", sum(["Услуги"])],
  ];
  const out: Invoice[] = [];
  for (const [title, amount] of groups) if (amount > 0) out.push(await addInvoice(by, leadId, title, Math.round(amount)));
  return out;
}

export async function setInvoicePaid(by: User, id: number, paid: boolean) {
  const inv = await q1<Invoice>(`select ${INV} from invoices where id=$1`, [id]);
  if (!inv) throw new AuthError("Счёт не найден", 404);
  await q(`update invoices set paid_at = ${paid ? "now()" : "null"} where id=$1`, [id]);
  await event(inv.lead_id, by.id, "invoice", `${paid ? "Оплачен" : "Снята отметка оплаты"}: «${inv.title}»`);
}

export async function deleteInvoice(by: User, id: number) {
  const inv = await q1<Invoice>(`select ${INV} from invoices where id=$1`, [id]);
  if (!inv) throw new AuthError("Счёт не найден", 404);
  if (inv.paid_at) throw new AuthError("Оплаченный счёт удалить нельзя — сначала снимите отметку оплаты");
  await q("delete from invoices where id=$1", [id]);
  await event(inv.lead_id, by.id, "invoice", `Удалён счёт «${inv.title}»`);
}

export async function invoiceWithLead(user: User, id: number) {
  const inv = await q1<Invoice>(`select ${INV} from invoices where id=$1`, [id]);
  if (!inv) throw new AuthError("Счёт не найден", 404);
  await assertLeadAccess(user, inv.lead_id);
  const lead = await q1<{ id: number; name: string; phone: string; lot_id: number | null; kind: string }>(
    "select id::int, name, phone, lot_id, kind from leads where id=$1", [inv.lead_id]);
  return { inv, lead: lead! };
}

// ---------- документы ----------
const UPLOADS = () => process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

export async function docsOf(leadIds: number[]): Promise<Doc[]> {
  if (!leadIds.length) return [];
  return q<Doc>(`select ${DOC} from documents where lead_id = any($1) order by created_at`, [leadIds]);
}

export async function saveDocument(by: User, leadId: number, file: File, name?: string) {
  const lead = await assertLeadAccess(by, leadId);
  if (!file || typeof file.arrayBuffer !== "function") throw new AuthError("Выберите файл");
  if (file.size > MAX_BYTES) throw new AuthError("Файл больше 20 МБ");
  const ext = ALLOWED[file.type];
  if (!ext) throw new AuthError("Можно загружать PDF, фото (JPG, PNG, WEBP, HEIC), Word и Excel");
  const stored = `${leadId}-${randomBytes(12).toString("hex")}${ext}`;
  await mkdir(UPLOADS(), { recursive: true });
  await writeFile(path.join(UPLOADS(), stored), Buffer.from(await file.arrayBuffer()));
  const title = (String(name || "").trim() || file.name || "Документ").slice(0, 200);
  const doc = await q1<Doc>(`insert into documents (lead_id, name, stored, mime, size, stage, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning ${DOC}`,
    [leadId, title, stored, file.type, file.size, statusLabel(lead.status), by.id]);
  await event(leadId, by.id, "document", `Документ «${title}»`);
  return doc!;
}

export async function readDocument(user: User, id: number) {
  const d = await q1<Doc & { stored: string }>(`select ${DOC}, stored from documents where id=$1`, [id]);
  if (!d) throw new AuthError("Документ не найден", 404);
  await assertLeadAccess(user, d.lead_id);
  const data = await readFile(path.join(UPLOADS(), path.basename(d.stored))).catch(() => null);
  if (!data) throw new AuthError("Файл не найден на сервере", 404);
  return { doc: d, data };
}

export async function deleteDocument(by: User, id: number) {
  const d = await q1<Doc & { stored: string }>(`select ${DOC}, stored from documents where id=$1`, [id]);
  if (!d) throw new AuthError("Документ не найден", 404);
  await q("delete from documents where id=$1", [id]);
  await unlink(path.join(UPLOADS(), path.basename(d.stored))).catch(() => {});
  await event(d.lead_id, by.id, "document", `Удалён документ «${d.name}»`);
}

// ---------- реквизиты ----------
export interface Requisites { legalName: string; unp: string; address: string; bank: string; bic: string; account: string; phone: string; email: string; note: string }
export const EMPTY_REQ: Requisites = { legalName: "", unp: "", address: "", bank: "", bic: "", account: "", phone: "", email: "", note: "" };

export async function getRequisites(): Promise<Requisites> {
  const r = await q1<{ value: Partial<Requisites> }>("select value from settings where key='requisites'").catch(() => null);
  return { ...EMPTY_REQ, ...(r?.value || {}) };
}

export async function saveRequisites(by: User, input: Partial<Requisites>) {
  const v = { ...EMPTY_REQ };
  for (const k of Object.keys(EMPTY_REQ) as (keyof Requisites)[]) v[k] = String(input[k] ?? "").trim().slice(0, k === "note" ? 1000 : 300);
  await q(`insert into settings (key, value, updated_by) values ('requisites', $1, $2)
           on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`, [JSON.stringify(v), by.id]);
  await q("insert into settings_history (key, after, changed, user_id) values ('requisites', $1, $2, $3)", [JSON.stringify(v), ["requisites"], by.id]);
  return v;
}

// ---------- новое для клиента ----------
export async function unseenCount(userId: number): Promise<number> {
  const r = await q1<{ n: number }>(
    `with seen as (select coalesce((select seen_at from client_seen where user_id=$1), 'epoch'::timestamptz) as t),
          my as (select id from leads where user_id=$1)
     select (
       (select count(*) from lead_events e, seen where e.lead_id in (select id from my) and e.type in ('status','invoice','document') and e.user_id is distinct from $1 and e.created_at > seen.t)
     )::int as n`, [userId]);
  return r?.n ?? 0;
}

export async function markSeen(userId: number) {
  await q("insert into client_seen (user_id, seen_at) values ($1, now()) on conflict (user_id) do update set seen_at = now()", [userId]);
}
