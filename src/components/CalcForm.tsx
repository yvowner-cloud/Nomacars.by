"use client";

import { useEffect, useState } from "react";
import { useApp } from "./Providers";
import { ageAtCustoms, DELIVERY_DAYS } from "@/lib/age";
import { US_STATES } from "@/lib/geo";
import { fmt, money } from "@/lib/format";
import type { CalcResult, Route, VehicleSize } from "@/lib/types";
import { RouteCompare } from "./RouteCompare";
import { ExactCalcButton } from "./LeadForms";

/** Калькулятор: ввод — в браузере, расчёт — на сервере (/api/calc) и только для вошедших. */
export function CalcForm() {
  const { user, country, setCountry, openLogin, open } = useApp();
  const priced = Boolean(user) || open;
  const [price, setPrice] = useState("14000");
  const [auction, setAuction] = useState("Copart");
  const [state, setState] = useState("NJ");
  const [fuel, setFuel] = useState("Бензин");
  const [cc, setCc] = useState("2487");
  const [hp, setHp] = useState("203");
  const [size, setSize] = useState("suv");
  const [date, setDate] = useState("2022-06");
  const [res, setRes] = useState<{ routes: Record<Route, CalcResult>; rates: { byn: number; rub: number; eurUsd: number } } | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [y, m] = (date || "2022-06").split("-").map(Number);
  const age = ageAtCustoms(y, m, new Date(), DELIVERY_DAYS);

  useEffect(() => {
    if (!priced) { setRes(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/calc", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
          body: JSON.stringify({ input: { price, auction, state, fuel, cc, hp, size }, country }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Не удалось посчитать");
        setRes(j); setErr("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setErr((e as Error).message);
      }
      setLoading(false);
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [priced, price, auction, state, fuel, cc, hp, size, country]);

  const c = res?.routes;

  return (
    <div className="lot">
      <div className="panel">
        <div className="panel-h">Параметры автомобиля</div>
        <div className="box">
          <span className="seg" role="group" aria-label="Страна" style={{ justifySelf: "start" }}>
            <button aria-pressed={country === "by"} onClick={() => setCountry("by")}>Беларусь</button>
            <button aria-pressed={country === "ru"} onClick={() => setCountry("ru")}>Россия</button>
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
            {([
              ["Ставка на аукционе, $", <input key="p" className="field num" id="c-price" type="number" step={100} value={price} onChange={(e) => setPrice(e.target.value)} />],
              ["Аукцион", <select key="a" className="field" id="c-auction" value={auction} onChange={(e) => setAuction(e.target.value)}><option>Copart</option><option>IAAI</option><option>Manheim</option></select>],
              ["Площадка (штат)", <select key="s" className="field" id="c-state" value={state} onChange={(e) => setState(e.target.value)}>{Object.entries(US_STATES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>],
              ["Тип кузова", <select key="b" className="field" id="c-size" value={size} onChange={(e) => setSize(e.target.value)}><option value="sedan">Седан, купе, хэтчбек</option><option value="suv">Кроссовер / SUV (как BMW X5)</option><option value="big">Большой SUV (BMW X7, Audi Q7, Explorer)</option></select>],
              ["Топливо", <select key="f" className="field" id="c-fuel" value={fuel} onChange={(e) => setFuel(e.target.value)}><option>Бензин</option><option>Дизель</option><option>Гибрид</option><option>Электро</option></select>],
              ["Объём двигателя, см³", <input key="c" className="field num" id="c-cc" type="number" value={cc} onChange={(e) => setCc(e.target.value)} />],
              ["Мощность, л.с.", <input key="h" className="field num" id="c-hp" type="number" value={hp} onChange={(e) => setHp(e.target.value)} />],
              ["Месяц и год выпуска", <input key="d" className="field" id="c-date" type="month" value={date} onChange={(e) => setDate(e.target.value)} />],
            ] as const).map(([label, el]) => (
              <label key={label} style={{ display: "grid", gap: 4, fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>{label}{el}</label>
            ))}
          </div>
          <div className="note" style={{ fontSize: 13.5 }}>
            {age < 3 ? <span style={{ color: "var(--red)" }}>Возраст на дату растаможки {age.toFixed(1)} г. Меньше 3 лет: льготная ставка не применяется, расчёт уточнит менеджер.</span>
              : age > 5 ? <span style={{ color: "var(--red)" }}>Возраст на дату растаможки {age.toFixed(1)} г. Старше 5 лет: пошлина будет выше, расчёт уточнит менеджер.</span>
              : <span style={{ color: "var(--green)" }}>Проходной автомобиль: {age.toFixed(1)} г. на дату растаможки (через ~{DELIVERY_DAYS} дней).</span>}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">Расчёт для {country === "by" ? "Беларуси" : "России"}</div>
        <div className="box" aria-busy={loading}>
          {!priced ? (
            <>
              <span className="pval blur" style={{ fontSize: 30 }} aria-hidden="true">$ 00 000</span>
              <p className="note" style={{ margin: 0 }}>Подробная разбивка с пошлиной, утильсбором и доставкой доступна после входа по номеру телефона.</p>
              <button className="btn btn-red" onClick={() => openLogin()}>Войти и рассчитать</button>
            </>
          ) : err ? (
            <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>
          ) : !c ? (
            <p className="note" style={{ margin: 0 }}>Считаем…</p>
          ) : (
            <>
              <div style={{ opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
                <RouteCompare r={c} country={country} />
              </div>
              <ExactCalcButton input={{ price: Number(price), auction, state, fuel, cc: Number(cc), hp: Number(hp), size: size as VehicleSize }} />
              {res && <p className="note" style={{ margin: 0 }}>Курс: 1 $ = {res.rates.byn} BYN / {res.rates.rub} ₽, 1 € = {res.rates.eurUsd} $. Ставки демонстрационные.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
