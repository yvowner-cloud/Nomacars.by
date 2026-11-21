"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../Providers";
import { calcTurnkey } from "@/lib/calc";
import { US_STATES } from "@/lib/geo";
import { fmt, money } from "@/lib/format";
import type { EditableTariffs } from "@/lib/tariff-validate";
import type { Tariffs } from "@/lib/types";

type Rates = { byn: number; rub: number; eurUsd: number; source: Record<"byn" | "rub" | "eurUsd", "manual" | "auto" | "default"> };
type Fx = { auto: { byn: number; rub: number; eurUsd: number } | null; fetchedAt: string | null; error: string | null; manual: Partial<Record<"byn" | "rub" | "eurUsd", number | null>> };
type Hist = { key: string; changed: string[]; changed_at: string; name: string | null; phone: string | null };
export interface TariffState { tariffs: EditableTariffs; fx: Fx; rates: Rates; history: Hist[] }

const LAST = Number.MAX_SAFE_INTEGER;
const LABELS: Record<string, string> = {
  service: "услуги компании", sea: "доставка по США и море", klBigExtra: "надбавка за большой SUV (Клайпеда)",
  landKlByEur: "Клайпеда → Минск", loadKlEur: "погрузка в Клайпеде", fwdKlEur: "экспедирование Клайпеда", landRu: "Клайпеда → Москва",
  landPotiBy: "Поти → Минск", landPotiByBig: "Поти → Минск (большой SUV)", landPotiRu: "Поти → Москва", fwdPoti: "экспедирование Поти",
  logistService: "услуга логиста", evLoad: "погрузка гибрида/электро",
  daysKlaipedaBy: "срок Клайпеда РБ", daysKlaipedaRu: "срок Клайпеда РФ", daysPotiBy: "срок Поти РБ", daysPotiRu: "срок Поти РФ",
  brokerBy: "брокер РБ", brokerRu: "брокер РФ", utilBy: "утильсбор РБ", utilRuLow: "утильсбор РФ до 160 л.с.",
  utilRuHigh: "утильсбор РФ свыше 160 л.с.", evRuPct: "пошлина на электро РФ", deliveryDays: "срок до растаможки",
  fees: "сбор аукциона", ccRates: "ставки пошлины",
  "manual.byn": "курс $→BYN", "manual.rub": "курс $→₽", "manual.eurUsd": "курс €→$",
};
const SAMPLE = { price: 14800, auction: "Copart", state: "NJ", fuel: "Бензин", cc: 2487, hp: 203, size: "suv" as const };

type Draft = Record<string, string>;
const toDraft = (t: EditableTariffs) => {
  const d: Record<string, string> = {};
  for (const [k, v] of Object.entries(t)) if (typeof v === "number") d[k] = String(v);
  for (const [k, v] of Object.entries(t.sea)) d[`sea.${k}`] = String(v);
  return d as Draft;
};
const rowsOf = (r: [number, number][]) => r.map(([a, b]) => [a >= LAST ? "" : String(a), String(b)]);
const manualOf = (fx: Fx) => {
  const m: Record<string, string> = {};
  for (const k of ["byn", "rub", "eurUsd"] as const) m[k] = fx.manual?.[k] ? String(fx.manual[k]) : "";
  return m;
};

export function TariffEditor({ initial, readOnly }: { initial: TariffState; readOnly: boolean }) {
  const router = useRouter();
  const { toast } = useApp();
  const [st, setSt] = useState(initial);
  const [d, setD] = useState<Draft>(toDraft(initial.tariffs));
  const [fees, setFees] = useState(rowsOf(initial.tariffs.fees));
  const [cc, setCc] = useState(rowsOf(initial.tariffs.ccRates));
  const [manual, setManual] = useState<Record<string, string>>(() => manualOf(initial.fx));
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const payload = () => {
    const t: Record<string, unknown> = {};
    const sea: Record<string, string> = {};
    for (const [k, v] of Object.entries(d)) {
      if (k.startsWith("sea.")) sea[k.slice(4)] = v.replace(",", ".");
      else t[k] = v;
    }
    t.sea = sea;
    t.fees = fees.map(([a, b]) => [a === "" ? LAST : Number(a.replace(",", ".")), Number(b.replace(",", "."))]);
    t.ccRates = cc.map(([a, b]) => [a === "" ? LAST : Number(a.replace(",", ".")), Number(b.replace(",", "."))]);
    for (const k of Object.keys(t)) if (typeof t[k] === "string") t[k] = (t[k] as string).replace(",", ".");
    return { tariffs: t, manualRates: Object.fromEntries(Object.entries(manual).map(([k, v]) => [k, v.trim() === "" ? null : v.replace(",", ".")])) };
  };

  const savedKey = JSON.stringify({ d: toDraft(st.tariffs), fees: rowsOf(st.tariffs.fees), cc: rowsOf(st.tariffs.ccRates), manual: manualOf(st.fx) });
  const dirty = savedKey !== JSON.stringify({ d, fees, cc, manual });

  // Предпросмотр: пример расчёта с текущими (несохранёнными) значениями
  const preview = useMemo(() => {
    try {
      const p = payload().tariffs as unknown as EditableTariffs;
      const num = (v: unknown) => Number(v);
      const rate = (k: "byn" | "rub" | "eurUsd") => (manual[k] ? Number(manual[k].replace(",", ".")) : st.rates[k]);
      const T: Tariffs = {
        ...st.tariffs,
        ...Object.fromEntries(Object.entries(p).filter(([k]) => !["sea", "fees", "ccRates"].includes(k)).map(([k, v]) => [k, num(v)])),
        sea: Object.fromEntries(Object.entries(p.sea).map(([k, v]) => [k, num(v)])),
        fees: p.fees, ccRates: p.ccRates, byn: rate("byn"), rub: rate("rub"), eurUsd: rate("eurUsd"),
      } as Tariffs;
      const by = calcTurnkey(SAMPLE, "by", T), ru = calcTurnkey(SAMPLE, "ru", T);
      const byP = calcTurnkey(SAMPLE, "by", T, "poti"), ruP = calcTurnkey(SAMPLE, "ru", T, "poti");
      return [by, ru, byP, ruP].every((x) => Number.isFinite(x.total)) ? { by, ru, byP, ruP } : null;
    } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, fees, cc, manual, st]);

  const save = async () => {
    setBusy(true); setErrors([]);
    try {
      const r = await fetch("/api/admin/tariffs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const j = await r.json();
      if (!r.ok) { setErrors(String(j.error || "Не удалось сохранить").split("\n")); return; }
      setSt(j); setD(toDraft(j.tariffs)); setFees(rowsOf(j.tariffs.fees)); setCc(rowsOf(j.tariffs.ccRates)); setManual(manualOf(j.fx));
      toast("Тарифы сохранены. Цены на сайте пересчитаны");
      router.refresh();
    } catch { setErrors(["Нет связи с сервером. Попробуйте ещё раз."]); }
    finally { setBusy(false); }
  };

  const refreshRates = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/fx", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setSt((s) => ({ ...s, fx: j.fx, rates: j.rates }));
      toast(j.fx.error ? "Не удалось получить курсы, см. сообщение в блоке курсов" : "Курсы обновлены");
    } catch (e) { toast((e as Error).message || "Не удалось обновить курсы"); }
    finally { setBusy(false); }
  };

  const num = (key: string, label: string, unit: string) => (
    <label className="t-field" key={key}>
      <span>{label}</span>
      <span className="t-input"><input className="field num" id={`t-${key}`} inputMode="decimal" value={d[key] ?? ""} disabled={readOnly}
        onChange={(e) => setD((x) => ({ ...x, [key]: e.target.value }) as Draft)} /><em>{unit}</em></span>
    </label>
  );

  const table = (title: string, rows: string[][], set: (r: string[][]) => void, limitUnit: string, valUnit: string, limitLabel: string, valLabel: string) => (
    <div className="panel">
      <div className="panel-h">{title}</div>
      <div className="box">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>{limitLabel}</th><th className="r">{valLabel}</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{i === rows.length - 1 ? <span className="muted">и выше</span>
                    : <span className="t-input"><input className="field num" style={{ width: 110 }} inputMode="decimal" value={r[0]} disabled={readOnly}
                      onChange={(e) => set(rows.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} /><em>{limitUnit}</em></span>}</td>
                  <td className="r"><span className="t-input"><input className="field num" style={{ width: 100 }} inputMode="decimal" value={r[1]} disabled={readOnly}
                    onChange={(e) => set(rows.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} /><em>{valUnit}</em></span></td>
                  <td>{!readOnly && rows.length > 1 && <button className="lock-cta" onClick={() => set(rows.filter((_, j) => j !== i))} aria-label="Удалить строку">Удалить</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!readOnly && <button className="btn btn-line btn-sm" style={{ justifySelf: "start" }}
          onClick={() => set([...rows.slice(0, -1), ["", ""], rows[rows.length - 1]])}>Добавить строку</button>}
      </div>
    </div>
  );

  const src = (k: "byn" | "rub" | "eurUsd") => ({ manual: "вручную", auto: k === "rub" ? "ЦБ РФ" : "НБРБ", default: "по умолчанию" })[st.rates.source[k]];

  return (
    <div style={{ display: "grid", gap: 16, paddingBottom: readOnly ? 0 : 80 }}>
      {readOnly && <div className="hint">Вы видите тарифы в режиме просмотра. Менять их может только владелец.</div>}
      <p className="hint" style={{ margin: 0 }}>Стартовые ставки демонстрационные. Перед запуском сверьте пошлины и утильсбор с действующими тарифами таможни РБ и РФ.</p>

      <div className="panel">
        <div className="panel-h">Курсы валют</div>
        <div className="box">
          <div className="t-grid">
            {([["byn", "1 $ в BYN"], ["rub", "1 $ в ₽"], ["eurUsd", "1 € в $"]] as const).map(([k, label]) => (
              <label className="t-field" key={k}>
                <span>{label}: <b className="num">{st.rates[k]}</b> <span className="muted">({src(k)})</span></span>
                <span className="t-input"><input className="field num" id={`r-${k}`} inputMode="decimal" placeholder="авто" value={manual[k]} disabled={readOnly}
                  onChange={(e) => setManual((m) => ({ ...m, [k]: e.target.value }))} /><em>вручную</em></span>
              </label>
            ))}
          </div>
          <p className="note" style={{ margin: 0 }}>
            Курсы обновляются автоматически с НБРБ и ЦБ РФ каждые 4 часа{st.fx.fetchedAt ? `, последний раз ${new Date(st.fx.fetchedAt).toLocaleString("ru-RU")}` : ", ещё не загружались"}.
            Ручное значение действует вместо автоматического, пока поле не очищено.
          </p>
          {st.fx.error && <p className="err" style={{ margin: 0 }}>Последняя попытка загрузить курсы не удалась: {st.fx.error}</p>}
          {!readOnly && <button className="btn btn-line btn-sm" style={{ justifySelf: "start" }} disabled={busy} onClick={refreshRates}>Обновить курсы сейчас</button>}
        </div>
      </div>

      <div className="two">
        <div className="panel">
          <div className="panel-h">Услуги и сроки</div>
          <div className="box t-grid">
            {num("service", "Услуги компании", "$")}
            {num("deliveryDays", "Срок от торгов до растаможки", "дней")}
          </div>
        </div>
        <div className="panel">
          <div className="panel-h">Утильсбор и электромобили</div>
          <div className="box t-grid">
            {num("utilBy", "Утильсбор РБ", "BYN")}
            {num("utilRuLow", "Утильсбор РФ до 160 л.с.", "₽")}
            {num("utilRuHigh", "Утильсбор РФ свыше 160 л.с.", "₽")}
            {num("evRuPct", "Пошлина на электро РФ", "%")}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">Логистика: доставка со стоянки аукциона и море, $</div>
        <div className="box">
          <p className="note" style={{ margin: 0 }}>По прайсу логиста: штат стоянки × класс машины. Класс определяется сам: седан, SUV (как BMW X5) или большой SUV (BMW X7, Audi Q7, Ford Explorer). В Клайпеду большой SUV = седан + надбавка.</p>
          <div className="tbl-wrap"><table>
            <thead><tr><th>Штат</th><th className="r">Клайпеда<br />седан</th><th className="r">Клайпеда<br />SUV</th><th className="r">Поти<br />седан</th><th className="r">Поти<br />SUV</th><th className="r">Поти<br />большой SUV</th></tr></thead>
            <tbody>{Object.entries(US_STATES).map(([z, v]) => (
              <tr key={z}>
                <td>{v.name}</td>
                {["kl." + z + ".sedan", "kl." + z + ".suv", "poti." + z + ".sedan", "poti." + z + ".suv", "poti." + z + ".big"].map((k) => (
                  <td className="r" key={k}><input className="field num" style={{ width: 84, textAlign: "right" }} inputMode="decimal" aria-label={k} value={d[`sea.${k}`] ?? ""} disabled={readOnly}
                    onChange={(e) => setD((x) => ({ ...x, [`sea.${k}`]: e.target.value }) as Draft)} /></td>
                ))}
              </tr>
            ))}</tbody>
          </table></div>
          <p className="note" style={{ margin: 0 }}>Иллинойс — все штаты Среднего Запада (Мичиган, Висконсин, Огайо…). В прайсе Lion Trans их нет, стоит оценка — уточните у логиста. Машины из Флориды логист отправляет через порт Джорджии.</p>
        </div>
      </div>

      <div className="two">
        <div className="panel">
          <div className="panel-h">Через Клайпеду</div>
          <div className="box t-grid">
            {num("klBigExtra", "Надбавка за большой SUV", "$")}
            {num("fwdKlEur", "Экспедирование", "€")}
            {num("loadKlEur", "Погрузка на автовоз", "€")}
            {num("landKlByEur", "Клайпеда → Минск", "€")}
            {num("landRu", "Клайпеда → Москва", "$")}
            {num("daysKlaipedaBy", "Срок до РБ", "дней")}
            {num("daysKlaipedaRu", "Срок до РФ", "дней")}
          </div>
        </div>
        <div className="panel">
          <div className="panel-h">Через Поти</div>
          <div className="box t-grid">
            {num("fwdPoti", "Экспедирование, портовые сборы", "$")}
            {num("landPotiBy", "Поти → Минск (седан, SUV)", "$")}
            {num("landPotiByBig", "Поти → Минск (большой SUV)", "$")}
            {num("landPotiRu", "Поти → Москва", "$")}
            {num("daysPotiBy", "Срок до РБ", "дней")}
            {num("daysPotiRu", "Срок до РФ", "дней")}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">Общее для обоих маршрутов</div>
        <div className="box t-grid">
          {num("logistService", "Услуга логиста", "$")}
          {num("evLoad", "Погрузка гибрида/электро", "$")}
          {num("brokerBy", "Брокер, СВХ, оформление РБ", "$")}
          {num("brokerRu", "Брокер, СВХ, оформление РФ", "$")}
        </div>
      </div>

      <div className="two">
        {table("Пошлина для авто 3–5 лет", cc, setCc, "см³", "€/см³", "Объём до", "Ставка")}
        {table("Сбор аукциона", fees, setFees, "$", "$", "Цена лота до", "Сбор")}
      </div>

      <div className="panel">
        <div className="panel-h">Проверка: пример расчёта</div>
        <div className="box">
          <p className="note" style={{ margin: 0 }}>2022 Toyota RAV4, ставка $14 800, Нью-Джерси, 2487 см³, 203 л.с. Пересчитывается сразу при вводе, до сохранения.</p>
          {preview ? (
            <div className="two">
              {(["by", "ru"] as const).map((c) => (
                <div key={c}>
                  <b>{c === "by" ? "Беларусь" : "Россия"}</b>
                  <div>через Клайпеду: <b className="num">{money(preview[c].total)}</b> <span className="note">≈ {fmt(preview[c].local)} {preview[c].currency} · {preview[c].days}</span></div>
                  <div>через Поти: <b className="num">{money(preview[c === "by" ? "byP" : "ruP"].total)}</b> <span className="note">≈ {fmt(preview[c === "by" ? "byP" : "ruP"].local)} {preview[c].currency} · {preview[c === "by" ? "byP" : "ruP"].days}</span></div>
                </div>
              ))}
            </div>
          ) : <p className="err" style={{ margin: 0 }}>В тарифах есть незаполненные или неверные значения.</p>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">История изменений</div>
        <div className="box">
          {st.history.length === 0 ? <p className="note" style={{ margin: 0 }}>Изменений пока не было — действуют стартовые значения.</p> : (
            <div className="tbl-wrap"><table>
              <thead><tr><th>Когда</th><th>Кто</th><th>Что изменено</th></tr></thead>
              <tbody>{st.history.map((h, i) => (
                <tr key={i}><td className="num">{new Date(h.changed_at).toLocaleString("ru-RU")}</td><td>{h.name || h.phone || "—"}</td>
                  <td style={{ whiteSpace: "normal" }}>{h.changed.map((c) => LABELS[c] || c).join(", ")}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="savebar" role="region" aria-label="Сохранение">
          <div className="wrap">
            {errors.length > 0 && <ul className="err" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
            <div className="savebar-row">
              <span className="note">{dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-line" disabled={!dirty || busy} onClick={() => { setD(toDraft(st.tariffs)); setFees(rowsOf(st.tariffs.fees)); setCc(rowsOf(st.tariffs.ccRates)); setManual(manualOf(st.fx)); setErrors([]); }}>Отменить</button>
                <button className="btn btn-red" disabled={!dirty || busy} onClick={save}>{busy ? "Сохраняем…" : "Сохранить изменения"}</button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
