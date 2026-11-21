import { describe, expect, it } from "vitest";
import { changedKeys, LAST, validateTariffs } from "./tariff-validate";
import { DEFAULT_TARIFFS } from "./tariffs";

describe("validateTariffs", () => {
  it("принимает корректные изменения", () => {
    const r = validateTariffs({ service: 800, fwdPoti: 250 });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value.service).toBe(800); expect(r.value.landKlByEur).toBe(DEFAULT_TARIFFS.landKlByEur); }
  });
  it("отклоняет отрицательные и нечисловые значения", () => {
    const r = validateTariffs({ service: -1, fwdPoti: Number("abc") as number });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveLength(2);
  });
  it("последняя строка таблицы всегда «и выше»", () => {
    const r = validateTariffs({ fees: [[5000, 500], [10000, 800], [123, 1200]] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.fees[2][0]).toBe(LAST);
  });
  it("границы таблицы должны расти", () => {
    const r = validateTariffs({ ccRates: [[1500, 1.7], [1000, 1.5], [0, 3.6]] });
    expect(r.ok).toBe(false);
  });
  it("срок доставки — целое число в разумных пределах", () => {
    expect(validateTariffs({ deliveryDays: 5 }).ok).toBe(false);
    const r = validateTariffs({ deliveryDays: 80.4 });
    expect(r.ok && r.value.deliveryDays).toBe(80);
  });
  it("доставка по штатам дополняет, а не затирает", () => {
    const r = validateTariffs({ sea: { "kl.NJ.sedan": 800, "bad.key": 5 } });
    expect(r.ok && r.value.sea).toEqual({ ...DEFAULT_TARIFFS.sea, "kl.NJ.sedan": 800 });
  });
  it("находит изменённые поля", () => {
    const r = validateTariffs({ service: 900 });
    expect(r.ok && changedKeys(DEFAULT_TARIFFS, r.value)).toEqual(["service"]);
  });
});
