import { describe, expect, it } from "vitest";
import { checkSendLimit, countryOfPhone, generateCode, hashCode, normalizePhone, OTP, sameHash } from "./otp";

describe("normalizePhone", () => {
  it("понимает белорусские форматы", () => {
    expect(normalizePhone("+375 (29) 123-45-67")).toBe("+375291234567");
    expect(normalizePhone("80291234567")).toBe("+375291234567");
    expect(normalizePhone("375 44 765 43 21")).toBe("+375447654321");
  });
  it("понимает российские форматы", () => {
    expect(normalizePhone("+7 916 123-45-67")).toBe("+79161234567");
    expect(normalizePhone("8 916 123 45 67")).toBe("+79161234567");
  });
  it("отклоняет мусор", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("+375 99 123 45 67")).toBeNull(); // нет такого кода оператора
    expect(normalizePhone("")).toBeNull();
  });
  it("определяет страну", () => {
    expect(countryOfPhone("+375291234567")).toBe("by");
    expect(countryOfPhone("+79161234567")).toBe("ru");
  });
});

describe("коды", () => {
  it("генерирует 4 цифры", () => {
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^\d{4}$/);
  });
  it("хеш зависит от номера и секрета", () => {
    const a = hashCode("+375291234567", "1234", "s1");
    expect(sameHash(a, hashCode("+375291234567", "1234", "s1"))).toBe(true);
    expect(sameHash(a, hashCode("+375291234568", "1234", "s1"))).toBe(false);
    expect(sameHash(a, hashCode("+375291234567", "1234", "s2"))).toBe(false);
  });
});

describe("checkSendLimit", () => {
  const now = 10_000_000;
  it("разрешает первую отправку", () => expect(checkSendLimit([], [], now).ok).toBe(true));
  it("не чаще раза в минуту", () => {
    const r = checkSendLimit([now - 30_000], [], now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterSec).toBe(30);
    expect(checkSendLimit([now - OTP.perPhoneGapMs - 1], [], now).ok).toBe(true);
  });
  it("не больше 5 в час на номер", () => {
    const sends = [1, 2, 3, 4, 5].map((k) => now - k * 5 * 60_000);
    expect(checkSendLimit(sends, [], now).ok).toBe(false);
  });
  it("не больше 20 в час с адреса", () => {
    const ip = Array.from({ length: 20 }, (_, k) => now - (k + 2) * 60_000);
    expect(checkSendLimit([], ip, now).ok).toBe(false);
  });
});
