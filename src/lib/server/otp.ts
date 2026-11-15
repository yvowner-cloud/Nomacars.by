import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/** Чистые функции для кодов входа — покрыты тестами (otp.test.ts). */

export const OTP = {
  length: 4,
  ttlMs: 5 * 60_000, // код действует 5 минут
  maxAttempts: 5, // попыток ввода на один код
  perPhoneGapMs: 60_000, // не чаще раза в минуту на номер
  perPhoneHour: 5, // не больше 5 кодов в час на номер
  perIpHour: 20, // не больше 20 кодов в час с одного адреса
};

/**
 * Приводит номер к виду +375XXXXXXXXX (РБ) или +7XXXXXXXXXX (РФ).
 * Принимает «+375 (29) 123-45-67», «80291234567», «8 916 123 45 67» и т.п.
 */
export function normalizePhone(input: string): string | null {
  let d = String(input || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("80")) d = "375" + d.slice(2); // 80 29 ... (РБ)
  else if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1); // 8 916 ... (РФ)
  if (/^375(25|29|33|44|17|15|16|21|22|23)\d{7}$/.test(d)) return "+" + d;
  if (/^7\d{10}$/.test(d)) return "+" + d;
  return null;
}

export const countryOfPhone = (phone: string): "by" | "ru" => (phone.startsWith("+375") ? "by" : "ru");

export function generateCode(len = OTP.length): string {
  let s = "";
  for (let i = 0; i < len; i++) s += String(randomInt(0, 10));
  return s;
}

export function hashCode(phone: string, code: string, pepper: string): string {
  return createHash("sha256").update(`${pepper}:${phone}:${code}`).digest("hex");
}

export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Можно ли отправить новый код. Принимает время прошлых отправок (мс). */
export function checkSendLimit(phoneSends: number[], ipSends: number[], now: number):
  | { ok: true }
  | { ok: false; reason: string; retryAfterSec: number } {
  const lastPhone = Math.max(0, ...phoneSends);
  if (now - lastPhone < OTP.perPhoneGapMs) {
    return { ok: false, reason: "Код уже отправлен. Повторно можно через минуту.", retryAfterSec: Math.ceil((OTP.perPhoneGapMs - (now - lastPhone)) / 1000) };
  }
  const hour = now - 3_600_000;
  if (phoneSends.filter((t) => t > hour).length >= OTP.perPhoneHour) {
    return { ok: false, reason: "Слишком много запросов кода на этот номер. Попробуйте через час.", retryAfterSec: 3600 };
  }
  if (ipSends.filter((t) => t > hour).length >= OTP.perIpHour) {
    return { ok: false, reason: "Слишком много запросов. Попробуйте позже.", retryAfterSec: 3600 };
  }
  return { ok: true };
}
