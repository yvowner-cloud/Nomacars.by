import { describe, expect, it } from "vitest";
import { checkImport } from "./lot-import";

const good = {
  auction: "Copart", lot_number: "12345678", url: "https://www.copart.com/lot/12345678", vin: "2T3W1RFV8NW123456",
  year: 2022, make: "Toyota", model: "RAV4", trim: "XLE", body: "suv", fuel: "Бензин", engine_cc: 2487, hp: 203,
  odometer_miles: 38200, primary_damage: "Front End", title: "Salvage", run_and_drive: true,
  sale_date: new Date(Date.now() + 3 * 86_400_000).toISOString(), current_bid_usd: 14800,
  photos: ["https://a/1.jpg", "https://a/2.jpg", "https://a/3.jpg", "https://a/4.jpg", "https://a/5.jpg"],
  damage_level: "light", score: 92, summary_ru: "Хорошая машина с лёгким повреждением бампера.",
};

describe("checkImport", () => {
  it("принимает корректный лот", () => {
    const r = checkImport({ lots: [good] });
    expect(r.ok).toBe(true);
    expect(r.valid).toBe(1);
    expect(r.lots[0].errors).toEqual([]);
  });
  it("понимает JSON текстом в ```-обёртке и с пояснением вокруг", () => {
    const r = checkImport("Вот результат:\n```json\n" + JSON.stringify({ lots: [good] }) + "\n```\nГотово.");
    expect(r.valid).toBe(1);
  });
  it("отсеивает утопленника и плохой документ", () => {
    const r = checkImport({ lots: [{ ...good, primary_damage: "Water/Flood" }, { ...good, lot_number: "2", title: "Parts Only" }] });
    expect(r.valid).toBe(0);
    expect(r.lots[0].errors.join()).toMatch(/исключённое повреждение/);
    expect(r.lots[1].errors.join()).toMatch(/документ/);
  });
  it("ловит дубли и пустые фото", () => {
    const r = checkImport({ lots: [good, good, { ...good, lot_number: "9", photos: [] }] });
    expect(r.lots[1].errors.join()).toMatch(/повторяется/);
    expect(r.lots[2].errors.join()).toMatch(/фото/);
  });
  it("предупреждает, но принимает спорные лоты", () => {
    const r = checkImport({ lots: [{ ...good, year: 2021, hp: null, odometer_miles: 70000 }] });
    expect(r.valid).toBe(1);
    expect(r.lots[0].warnings.length).toBeGreaterThanOrEqual(3);
  });
  it("принимает Manheim: номер с буквами, без повреждений, оценка CR", () => {
    const r = checkImport({ lots: [{ ...good, auction: "Manheim", lot_number: "PA-1234567", primary_damage: null, condition_grade: 42, title: "Clean" }] });
    expect(r.valid).toBe(1);
    expect(r.lots[0].lot?.lot_number).toBe("PA-1234567");
    expect(r.lots[0].lot?.primary_damage).toBe("None");
    expect(r.lots[0].lot?.condition_grade).toBe(4.2);
  });
  it("отсеивает Manheim с отметкой о раме или затоплении", () => {
    const r = checkImport({ lots: [{ ...good, auction: "Manheim", lot_number: "X1", announcements: "Frame damage, prior paint" }] });
    expect(r.valid).toBe(0);
  });
  it("сообщает о сломанном JSON", () => {
    expect(checkImport("{lots: [").fatal).toMatch(/JSON/);
  });
});
