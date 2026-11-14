"use client";

import { useState } from "react";
import { useApp } from "./Providers";
import { ageAtCustoms, calcTurnkey } from "@/lib/calc";
import { DEFAULT_TARIFFS, US_STATES } from "@/lib/tariffs";
import { fmt, money } from "@/lib/format";

export function CalcForm() {
  const { user, country, setCountry, openLogin, toast } = useApp();
  const [price, setPrice] = useState("14000");
  const [auction, setAuction] = useState("Copart");
  const [state, setState] = useState("NJ");
  const [fuel, setFuel] = useState("Бензин");
  const [cc, setCc] = useState("2487");
  const [hp, setHp] = useState("203");
  const [date, setDate] = useState("2022-06");

  const [y, m] = (date || "2022-06").split("-").map(Number);
  const age = ageAtCustoms(y, m, new Date(), DEFAULT_TARIFFS.deliveryDays);
  const c = calcTurnkey({ price: +price, auction, state, fuel, cc: +cc, hp: +hp }, country);
  const T = DEFAULT_TARIFFS;

  return (
    <div className="lot">
      <div className="panel">
        <div className="panel-h">Параметры автомобиля</div>
        <div className="box">
          <span className="seg" role="group" aria-label="Страна" style={{ justifySelf: "start" }}>
            <button aria-pressed={country === "by"} onClick={() => setCountry("by")}>Беларусь</button>
            <button aria-pressed={country === "ru"} onClick={() => setCountry("ru")}>Россия</button>
          </span>
          <div className="calc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
            {([
              ["Ставка на аукционе, $", <input key="p" className="field num" id="c-price" type="number" step={100} value={price} onChange={(e) => setPrice(e.target.value)} />],
              ["Аукцион", <select key="a" className="field" id="c-auction" value={auction} onChange={(e) => setAuction(e.target.value)}><option>Copart</option><option>IAAI</option></select>],
              ["Площадка (штат)", <select key="s" className="field" id="c-state" value={state} onChange={(e) => setState(e.target.value)}>{Object.entries(US_STATES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>],
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
              : <span style={{ color: "var(--green)" }}>Проходной автомобиль: {age.toFixed(1)} г. на дату растаможки (через ~{T.deliveryDays} дней).</span>}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">Расчёт для {country === "by" ? "Беларуси" : "России"}</div>
        <div className="box">
          {user ? (
            <>
              <div>
                {c.lines.map((x) => (
                  <div className="cl" key={x.label}><div>{x.label}<small>{x.note}</small></div><div className="v num">{money(x.usd)}</div></div>
                ))}
                <div className="cl total"><div><b>Итого под ключ</b><small>≈ {fmt(c.local)} {c.currency} · срок {c.days}</small></div><div className="v num">{money(c.total)}</div></div>
              </div>
              <button className="btn btn-red" onClick={() => toast("Запрос отправлен, менеджер пришлёт точный расчёт")}>Получить точный расчёт</button>
              <p className="note" style={{ margin: 0 }}>Курс: 1 $ = {T.byn} BYN / {T.rub} ₽, 1 € = {T.eurUsd} $. Ставки демонстрационные.</p>
            </>
          ) : (
            <>
              <span className="pval blur" style={{ fontSize: 30 }} aria-hidden="true">$ 00 000</span>
              <p className="note" style={{ margin: 0 }}>Подробная разбивка с пошлиной, утильсбором и доставкой доступна после входа по номеру телефона.</p>
              <button className="btn btn-red" onClick={() => openLogin()}>Войти и рассчитать</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
