import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { dbConfigured, q, q1 } from "./db";
import { checkSendLimit, countryOfPhone, generateCode, hashCode, normalizePhone, OTP, sameHash } from "./otp";
import { sendSms, smsMode, type Delivery } from "./sms";
import type { Country } from "../types";

export type Role = "client" | "manager" | "owner";
export interface User { id: number; phone: string; name: string; country: Country; role: Role }

const COOKIE = "nc_session";
const SESSION_DAYS = 90;

const pepper = () => process.env.SESSION_SECRET || "dev-secret-change-me";
const tokenId = (token: string) => createHash("sha256").update(token).digest("hex");

/** Телефоны владельцев из .env: OWNER_PHONES=+375291234567,+375441234567 */
function ownerPhones(): Set<string> {
  return new Set((process.env.OWNER_PHONES || "").split(",").map((p) => normalizePhone(p.trim())).filter(Boolean) as string[]);
}

export async function clientInfo() {
  const h = await headers();
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return { ip, ua: (h.get("user-agent") || "").slice(0, 300) };
}

export class AuthError extends Error {
  constructor(message: string, public status = 400, public retryAfterSec?: number) { super(message); }
}

function requireDb() {
  if (!dbConfigured()) throw new AuthError("Вход временно недоступен: база данных не настроена.", 503);
}

/** Шаг 1: отправить код. */
export async function sendLoginCode(rawPhone: string): Promise<{ phone: string; delivery: Delivery }> {
  requireDb();
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new AuthError("Введите номер в формате +375 29 123-45-67 или +7 916 123-45-67");
  const { ip } = await clientInfo();
  const now = Date.now();
  const [byPhone, byIp] = await Promise.all([
    q<{ t: string }>("select extract(epoch from created_at)*1000 as t from otp_codes where phone=$1 and created_at > now() - interval '1 hour'", [phone]),
    q<{ t: string }>("select extract(epoch from created_at)*1000 as t from otp_codes where ip=$1 and created_at > now() - interval '1 hour'", [ip]),
  ]);
  const lim = checkSendLimit(byPhone.map((r) => Number(r.t)), byIp.map((r) => Number(r.t)), now);
  if (!lim.ok) throw new AuthError(lim.reason, 429, lim.retryAfterSec);

  const code = generateCode();
  await q("insert into otp_codes (phone, code_hash, ip, expires_at) values ($1, $2, $3, now() + $4 * interval '1 millisecond')",
    [phone, hashCode(phone, code, pepper()), ip, OTP.ttlMs]);
  try {
    await sendSms(phone, `Ncars: код для входа ${code}. Никому не сообщайте его.`);
  } catch (e) {
    console.error("[sms] не отправлено:", (e as Error).message);
    // Запасной вход владельца: если SMS-сервис сломался, код владельца пишется в журнал сервера,
    // чтобы владелец не остался без доступа к кабинету.
    if (ownerPhones().has(phone)) {
      console.log(`[SMS] ${phone}: (SMS не ушла, запасной код владельца) ${code}`);
      return { phone, delivery: "log" };
    }
    throw new AuthError("Не удалось отправить SMS. Попробуйте через минуту или напишите нам в Telegram.", 502);
  }
  return { phone, delivery: smsMode() };
}

/** Шаг 2: проверить код, создать пользователя при первом входе, выдать сессию. */
export async function verifyLoginCode(rawPhone: string, code: string, name?: string, country?: Country): Promise<User> {
  requireDb();
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new AuthError("Неверный номер телефона");
  const otp = await q1<{ id: string; code_hash: string; attempts: number }>(
    "select id, code_hash, attempts from otp_codes where phone=$1 and consumed_at is null and expires_at > now() order by created_at desc limit 1",
    [phone]);
  if (!otp) throw new AuthError("Код устарел. Запросите новый.");
  if (otp.attempts >= OTP.maxAttempts) throw new AuthError("Слишком много неверных попыток. Запросите новый код.", 429);
  if (!/^\d{4}$/.test(code) || !sameHash(otp.code_hash, hashCode(phone, code, pepper()))) {
    await q("update otp_codes set attempts = attempts + 1 where id=$1", [otp.id]);
    const left = OTP.maxAttempts - otp.attempts - 1;
    throw new AuthError(left > 0 ? `Неверный код. Осталось попыток: ${left}.` : "Неверный код. Запросите новый.");
  }
  await q("update otp_codes set consumed_at = now() where id=$1", [otp.id]);

  const isOwner = ownerPhones().has(phone);
  const cleanName = (name || "").trim().slice(0, 80);
  const cty: Country = country === "ru" || country === "by" ? country : countryOfPhone(phone);
  const user = await q1<User>(
    `insert into users (phone, name, country, role, last_login_at)
       values ($1, $2, $3, $4, now())
     on conflict (phone) do update set
       last_login_at = now(),
       name = case when excluded.name <> '' then excluded.name else users.name end,
       role = case when $5 then 'owner' when users.role = 'owner' then 'client' else users.role end
     returning id::int, phone, name, country, role`,
    [phone, cleanName, cty, isOwner ? "owner" : "client", isOwner]);
  if (!user) throw new AuthError("Не удалось войти", 500);

  const token = randomBytes(32).toString("base64url");
  const { ip, ua } = await clientInfo();
  await q("insert into sessions (id, user_id, expires_at, ip, user_agent) values ($1, $2, now() + $3 * interval '1 day', $4, $5)",
    [tokenId(token), user.id, SESSION_DAYS, ip, ua]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86_400,
    secure: process.env.NODE_ENV === "production" && (process.env.SITE_URL || "").startsWith("https://"),
  });
  return user;
}

/** Текущий пользователь по cookie (или null). Никогда не бросает — сайт работает и без базы. */
export async function currentUser(): Promise<User | null> {
  if (!dbConfigured()) return null;
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return null;
    return await q1<User>(
      `select u.id::int, u.phone, u.name, u.country, u.role from sessions s join users u on u.id = s.user_id
       where s.id = $1 and s.expires_at > now()`, [tokenId(token)]);
  } catch (e) {
    console.error("[auth] currentUser:", (e as Error).message);
    return null;
  }
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token && dbConfigured()) await q("delete from sessions where id=$1", [tokenId(token)]).catch(() => {});
  jar.delete(COOKIE);
}

export async function updateProfile(userId: number, patch: { name?: string; country?: Country }) {
  if (patch.name !== undefined) await q("update users set name=$2 where id=$1", [userId, patch.name.trim().slice(0, 80)]);
  if (patch.country === "by" || patch.country === "ru") await q("update users set country=$2 where id=$1", [userId, patch.country]);
}

export async function favoriteIds(userId: number): Promise<number[]> {
  return (await q<{ lot_id: number }>("select lot_id from favorites where user_id=$1 order by created_at", [userId])).map((r) => r.lot_id);
}

export async function setFavorite(userId: number, lotId: number, on: boolean) {
  if (on) await q("insert into favorites (user_id, lot_id) values ($1, $2) on conflict do nothing", [userId, lotId]);
  else await q("delete from favorites where user_id=$1 and lot_id=$2", [userId, lotId]);
}
