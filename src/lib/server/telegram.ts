import { dbConfigured, q, q1 } from "./db";

/**
 * Уведомления в Telegram.
 *  1. Владелец создаёт бота у @BotFather и кладёт токен в /srv/nomacars/.env: TELEGRAM_BOT_TOKEN=...
 *  2. Пишет боту /start (или добавляет бота в рабочую группу и пишет там /start).
 *  3. В кабинете: «Заявки» → «Подключить Telegram» — сайт сам находит этот чат и запоминает его.
 * Чаты хранятся в settings.telegram = { chats: [{ id, title }] }.
 */
const token = () => process.env.TELEGRAM_BOT_TOKEN || "";
export const telegramConfigured = () => Boolean(token());

export interface TgChat { id: number; title: string }

async function tg<T>(method: string, payload: unknown): Promise<T> {
  const r = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!j.ok) throw new Error(j.description || `Telegram ответил ${r.status}`);
  return j.result as T;
}

export async function linkedChats(): Promise<TgChat[]> {
  if (!dbConfigured()) return [];
  const r = await q1<{ value: { chats?: TgChat[] } }>("select value from settings where key='telegram'");
  return r?.value?.chats ?? [];
}

async function saveChats(chats: TgChat[]) {
  await q(`insert into settings (key, value) values ('telegram', $1)
           on conflict (key) do update set value = excluded.value, updated_at = now()`, [JSON.stringify({ chats })]);
}

/** Найти чаты, где боту написали /start, и запомнить их. */
export async function linkFromUpdates(): Promise<TgChat[]> {
  if (!telegramConfigured()) throw new Error("Не задан TELEGRAM_BOT_TOKEN в /srv/nomacars/.env");
  type Upd = { message?: { text?: string; chat: { id: number; title?: string; first_name?: string; last_name?: string; username?: string } } };
  const updates = await tg<Upd[]>("getUpdates", { allowed_updates: ["message"], limit: 100 });
  const found = new Map<number, TgChat>();
  for (const u of updates) {
    const m = u.message;
    if (!m || !/^\/start/.test(m.text || "")) continue;
    const c = m.chat;
    found.set(c.id, { id: c.id, title: c.title || [c.first_name, c.last_name].filter(Boolean).join(" ") || c.username || String(c.id) });
  }
  if (!found.size) throw new Error("Бот не видит сообщения /start. Напишите боту /start и нажмите кнопку ещё раз.");
  const merged = new Map((await linkedChats()).map((c) => [c.id, c]));
  for (const c of found.values()) merged.set(c.id, c);
  const chats = [...merged.values()];
  await saveChats(chats);
  await Promise.allSettled(chats.map((c) => tg("sendMessage", { chat_id: c.id, text: "Ncars: уведомления о новых заявках подключены ✅" })));
  return chats;
}

export async function unlinkChat(id: number) {
  await saveChats((await linkedChats()).filter((c) => c.id !== id));
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Отправить сообщение во все привязанные чаты. Не бросает — заявка важнее уведомления. */
export async function notify(htmlLines: string[]): Promise<boolean> {
  if (!telegramConfigured()) return false;
  const chats = await linkedChats().catch(() => []);
  if (!chats.length) return false;
  const text = htmlLines.join("\n");
  const res = await Promise.allSettled(chats.map((c) => tg("sendMessage", { chat_id: c.id, text, parse_mode: "HTML", disable_web_page_preview: true })));
  res.forEach((r) => r.status === "rejected" && console.error("[telegram]", (r.reason as Error).message));
  return res.some((r) => r.status === "fulfilled");
}

export { esc as tgEscape };
