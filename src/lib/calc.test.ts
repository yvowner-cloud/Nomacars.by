import { describe, expect, it } from "vitest";
import { ageAtCustoms, calcTurnkey, isPassable } from "./calc";
import { DEFAULT_TARIFFS as T } from "./tariffs";

const rav4 = { price: 14800, auction: "Copart", state: "NJ", fuel: "Бензин", cc: 2487, hp: 203 };

describe("calcTurnkey", () => {
  it("складывает все строки в итог", () => {
    const r = calcTurnkey(rav4, "by");
    expect(r.total).toBeCloseTo(r.lines.reduce((s, l) => s + l.usd, 0));
    expect(r.lines).toHaveLength(9);
  });

  it("пошлина РБ для 2487 см³ = €3.0/см³", () => {
    const r = calcTurnkey(rav4, "by");
    expect(r.lines[5].usd).toBeCloseTo(3.0 * 2487 * T.eurUsd);
  });

  it("сбор аукциона берётся по шкале", () => {
    expect(calcTurnkey({ ...rav4, price: 2500 }, "by").lines[1].usd).toBe(450);
    expect(calcTurnkey({ ...rav4, price: 15000 }, "by").lines[1].usd).toBe(1000);
    expect(calcTurnkey({ ...rav4, price: 50000 }, "by").lines[1].usd).toBe(1350);
  });

  it("утильсбор РФ зависит от мощности 160 л.с.", () => {
    const low = calcTurnkey({ ...rav4, hp: 147 }, "ru").lines[6].usd;
    const high = calcTurnkey({ ...rav4, hp: 203 }, "ru").lines[6].usd;
    expect(low).toBeCloseTo(T.utilRuLow / T.rub);
    expect(high).toBeCloseTo(T.utilRuHigh / T.rub);
  });

  it("электромобиль в РБ без пошлины", () => {
    expect(calcTurnkey({ ...rav4, fuel: "Электро", cc: 0 }, "by").lines[5].usd).toBe(0);
  });

  it("местная валюта считается по курсу", () => {
    const by = calcTurnkey(rav4, "by");
    const ru = calcTurnkey(rav4, "ru");
    expect(by.local).toBeCloseTo(by.total * T.byn);
    expect(ru.currency).toBe("₽");
  });

  it("мусорный ввод не ломает расчёт", () => {
    const r = calcTurnkey({ price: NaN, state: "XX", fuel: "Бензин", cc: -5, hp: 0 }, "by");
    expect(Number.isFinite(r.total)).toBe(true);
  });
});

describe("ageAtCustoms", () => {
  it("учитывает срок доставки", () => {
    const sale = new Date(2026, 10, 14);
    const age = ageAtCustoms(2022, 1, sale, 75);
    expect(age).toBeGreaterThan(5); // к растаможке машина станет непроходной
    expect(isPassable(age)).toBe(false);
    expect(isPassable(ageAtCustoms(2022, 9, sale, 75))).toBe(true);
  });
});
