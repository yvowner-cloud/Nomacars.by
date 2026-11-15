import { describe, expect, it } from "vitest";
import { rowToLot } from "./catalog";
import type { ImportedLot } from "../lot-import";

const data: ImportedLot = {
  auction: "IAAI", lot_number: "39887766", url: "https://www.iaai.com/x", vin: "KM8J3CAL5PU000000", vin_masked: true,
  year: 2023, manufactured: null, make: "Hyundai", model: "Tucson", trim: "SEL", body: "suv", color: "Dark Blue", fuel: "Бензин",
  engine: "2.5L 4", engine_cc: 2497, hp: null, transmission: "Automatic", drive: "FWD", odometer_miles: 21400, odometer_status: "Actual",
  primary_damage: "Rear", secondary_damage: "Minor Dent/Scratches", title: "Salvage", title_state: "GA", run_and_drive: true, keys: true,
  airbags_deployed: false, location_city: "Atlanta", location_state: "ga", sale_date: null, current_bid_usd: 12600, buy_now_usd: null,
  est_retail_value_usd: 26100, photos: ["https://vis.iaai.com/1.jpg"], damage_level: "light", score: 88, repair_estimate_usd: [800, 1300],
  summary_ru: "Почти новый Tucson.", damage_plain_ru: "Задний бампер.", why_ru: ["Небольшой пробег"], risks_ru: ["Парктроники"],
};
const now = Date.parse("2026-11-15T12:00:00Z");
const row = (over: Partial<{ status: string; sale_at: string | null; sold_price: number | null }> = {}) => ({
  id: 1005, auction: "IAAI", lot_number: "39887766", slug: "hyundai-tucson-2023-1005", data, score: 88,
  sale_at: "2026-11-20T14:00:00Z", status: "active", sold_price: null, visible: true, created_at: "2026-11-15T10:00:00Z", ...over,
});

describe("rowToLot", () => {
  it("переводит лот подборки в лот сайта", () => {
    const l = rowToLot(row(), now);
    expect(l.make).toBe("Hyundai");
    expect(l.state).toBe("GA");
    expect(l.price).toBe(12600);
    expect(l.zone).toBe("rear");
    expect(l.damage).toBe("Rear, Minor Dent/Scratches");
    expect(l.photos).toHaveLength(1);
    expect(l.review?.summary).toBe("Почти новый Tucson.");
    expect(l.vin).toMatch(/••/); // VIN скрыт аукционом — не показываем целиком
  });
  it("неизвестный месяц и мощность — осторожные допущения", () => {
    const l = rowToLot(row(), now);
    expect(l.monthKnown).toBe(false);
    expect(l.month).toBe(1);
    expect(l.hpEstimated).toBe(true);
    expect(l.hp).toBeGreaterThan(160); // 2.5 л — считаем как свыше 160 л.с. для РФ
  });
  it("прошедшие торги без итога — «Торги завершены»", () => {
    expect(rowToLot(row({ sale_at: "2026-11-10T14:00:00Z" }), now).status).toBe("ended");
  });
  it("продан — цена выкупа вместо ставки", () => {
    const l = rowToLot(row({ status: "sold", sold_price: 13900 }), now);
    expect(l.status).toBe("sold");
    expect(l.price).toBe(13900);
  });
});
