import { describe, expect, it } from "vitest";
import { parseCbr, parseNbrb } from "./fx";

describe("parseNbrb", () => {
  it("берёт официальный курс с учётом масштаба", () => {
    expect(parseNbrb({ Cur_ID: 431, Cur_Abbreviation: "USD", Cur_Scale: 1, Cur_OfficialRate: 3.2741 })).toBeCloseTo(3.2741);
    expect(parseNbrb({ Cur_Abbreviation: "RUB", Cur_Scale: 100, Cur_OfficialRate: 3.5512 })).toBeCloseTo(0.035512);
  });
  it("ругается на пустой ответ", () => {
    expect(() => parseNbrb({})).toThrow();
  });
});

describe("parseCbr", () => {
  const xml = `<?xml version="1.0" encoding="windows-1251"?><ValCurs Date="15.11.2026" name="Foreign Currency Market">
    <Valute ID="R01235"><NumCode>840</NumCode><CharCode>USD</CharCode><Nominal>1</Nominal><Name>x</Name><Value>92,4512</Value><VunitRate>92,4512</VunitRate></Valute>
    <Valute ID="R01239"><NumCode>978</NumCode><CharCode>EUR</CharCode><Nominal>1</Nominal><Name>y</Name><Value>100,1234</Value></Valute>
    <Valute ID="R01090B"><NumCode>933</NumCode><CharCode>BYN</CharCode><Nominal>1</Nominal><Name>z</Name><Value>28,2000</Value></Valute>
    <Valute ID="R01375"><NumCode>156</NumCode><CharCode>CNY</CharCode><Nominal>10</Nominal><Name>w</Name><Value>127,5000</Value></Valute>
  </ValCurs>`;
  it("находит USD", () => expect(parseCbr(xml)).toBeCloseTo(92.4512));
  it("учитывает номинал", () => expect(parseCbr(xml, "CNY")).toBeCloseTo(12.75));
  it("не путает валюты", () => expect(parseCbr(xml, "EUR")).toBeCloseTo(100.1234));
  it("ругается, если валюты нет", () => expect(() => parseCbr(xml, "GBP")).toThrow());
});
