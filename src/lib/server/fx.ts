/**
 * Курсы валют.
 *  - USD → BYN и EUR → BYN: Национальный банк РБ (api.nbrb.by)
 *  - USD → RUB: Центральный банк РФ (cbr.ru, XML)
 *  - EUR → USD считается как (EUR→BYN) / (USD→BYN)
 * Обновляются при старте сайта и каждые 4 часа. Ручной курс владельца имеет приоритет.
 */

export interface FxRates { byn: number; rub: number; eurUsd: number }

/** Ответ НБРБ /exrates/rates/USD?parammode=2 → BYN за 1 единицу валюты. */
export function parseNbrb(json: unknown): number {
  const j = json as { Cur_OfficialRate?: number; Cur_Scale?: number };
  const rate = Number(j?.Cur_OfficialRate);
  const scale = Number(j?.Cur_Scale) || 1;
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("НБРБ: нет курса в ответе");
  return rate / scale;
}

/** XML ЦБ РФ (XML_daily.asp) → рублей за 1 единицу валюты (по умолчанию USD). */
export function parseCbr(xml: string, code = "USD"): number {
  const block = xml.match(new RegExp(`<Valute[^>]*>(?:(?!</Valute>)[\\s\\S])*?<CharCode>${code}</CharCode>[\\s\\S]*?</Valute>`));
  if (!block) throw new Error(`ЦБ РФ: нет ${code} в ответе`);
  const nominal = Number((block[0].match(/<Nominal>(\d+)<\/Nominal>/) || [])[1] || 1);
  const value = Number(((block[0].match(/<Value>([\d,.]+)<\/Value>/) || [])[1] || "").replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) throw new Error(`ЦБ РФ: неверный курс ${code}`);
  return value / nominal;
}

const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

export async function fetchFx(): Promise<FxRates> {
  const t = { signal: AbortSignal.timeout(15_000) };
  const [usd, eur, cbrXml] = await Promise.all([
    fetch("https://api.nbrb.by/exrates/rates/USD?parammode=2", t).then((r) => { if (!r.ok) throw new Error(`НБРБ ${r.status}`); return r.json(); }),
    fetch("https://api.nbrb.by/exrates/rates/EUR?parammode=2", t).then((r) => { if (!r.ok) throw new Error(`НБРБ ${r.status}`); return r.json(); }),
    fetch("https://www.cbr.ru/scripts/XML_daily.asp", t).then(async (r) => {
      if (!r.ok) throw new Error(`ЦБ РФ ${r.status}`);
      // ЦБ отдаёт windows-1251, но цифры и коды валют — латиница, поэтому достаточно latin1
      return new TextDecoder("latin1").decode(await r.arrayBuffer());
    }),
  ]);
  const byn = parseNbrb(usd);
  const eurByn = parseNbrb(eur);
  return { byn: round(byn), rub: round(parseCbr(cbrXml, "USD")), eurUsd: round(eurByn / byn) };
}
