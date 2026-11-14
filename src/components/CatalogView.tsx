"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Lot } from "@/lib/types";
import { LotBadge, LotCard } from "./LotCard";
import { CarArt } from "./CarArt";
import { TurnkeyPrice } from "./Price";
import { CardTimer } from "./Timer";
import { useApp } from "./Providers";
import { calcTurnkey } from "@/lib/calc";
import { engineStr, kmStr } from "@/lib/format";

export interface Initial { q?: string; make?: string; body?: string; fuel?: string; auction?: string; top?: string; watch?: string }

type Sort = "rec" | "date" | "price" | "year" | "miles";

export function CatalogView({ lots, initial }: { lots: Lot[]; initial: Initial }) {
  const { user, country, watch, openLogin } = useApp();
  const [q, setQ] = useState(initial.q ?? "");
  const [makes, setMakes] = useState<string[]>(initial.make ? [initial.make] : []);
  const [body, setBody] = useState(initial.body ?? "");
  const [fuel, setFuel] = useState(initial.fuel ?? "");
  const [auction, setAuction] = useState(initial.auction ?? "");
  const [year, setYear] = useState("");
  const [light, setLight] = useState(false);
  const [topOnly, setTopOnly] = useState(initial.top === "1");
  const [watchOnly, setWatchOnly] = useState(initial.watch === "1");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState<Sort>("rec");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [open, setOpen] = useState(false);

  const total = (l: Lot) => calcTurnkey(l, country).total;

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const r = lots.filter((l) =>
      (!qq || `${l.make} ${l.model} ${l.trim} ${l.year} ${l.lotNo} ${l.vin}`.toLowerCase().includes(qq)) &&
      (!makes.length || makes.includes(l.make)) &&
      (!body || l.body === body) && (!fuel || l.fuel === fuel) && (!auction || l.auction === auction) &&
      (!year || l.year === +year) && (!light || l.level === "light") && (!topOnly || l.top) &&
      (!watchOnly || watch.includes(l.id)) && (!max || !user || total(l) <= +max));
    const cmp: Record<Sort, (a: Lot, b: Lot) => number> = {
      rec: (a, b) => Number(b.top) - Number(a.top) || b.aiScore - a.aiScore,
      date: (a, b) => a.saleOffsetDays - b.saleOffsetDays,
      price: (a, b) => total(a) - total(b),
      year: (a, b) => b.year * 12 + b.month - (a.year * 12 + a.month),
      miles: (a, b) => a.miles - b.miles,
    };
    return r.sort(cmp[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lots, q, makes, body, fuel, auction, year, light, topOnly, watchOnly, max, sort, country, user, watch]);

  const makeCounts = useMemo(() => {
    const m = new Map<string, number>();
    lots.forEach((l) => m.set(l.make, (m.get(l.make) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [lots]);

  const reset = () => { setQ(""); setMakes([]); setBody(""); setFuel(""); setAuction(""); setYear(""); setLight(false); setTopOnly(false); setWatchOnly(false); setMax(""); };

  return (
    <div className="cat">
      <aside className={`panel filters${open ? " open" : ""}`} aria-label="Фильтры">
        <div className="panel-h">Фильтры</div>
        <div className="fgroup">
          <b>Поиск</b>
          <input className="field" id="f-q" placeholder="Модель, лот, VIN" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="fgroup">
          <b>Подборка</b>
          <label className="chk"><span><input type="checkbox" checked={topOnly} onChange={(e) => setTopOnly(e.target.checked)} />Только «Топ недели»</span></label>
          <label className="chk"><span><input type="checkbox" checked={light} onChange={(e) => setLight(e.target.checked)} />Только лёгкие повреждения</span></label>
          <label className="chk"><span><input type="checkbox" checked={watchOnly} onChange={(e) => setWatchOnly(e.target.checked)} />Избранное</span><em>{watch.length}</em></label>
        </div>
        <div className="fgroup">
          <b>Марка</b>
          {makeCounts.map(([m, n]) => (
            <label className="chk" key={m}>
              <span><input type="checkbox" checked={makes.includes(m)} onChange={(e) => setMakes((s) => e.target.checked ? [...s, m] : s.filter((x) => x !== m))} />{m}</span>
              <em>{n}</em>
            </label>
          ))}
        </div>
        <div className="fgroup">
          <b>Параметры</b>
          <select className="field" id="f-body" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Кузов">
            <option value="">Любой кузов</option><option value="suv">Кроссовер / SUV</option><option value="sedan">Седан</option>
          </select>
          <select className="field" id="f-fuel" value={fuel} onChange={(e) => setFuel(e.target.value)} aria-label="Топливо">
            <option value="">Любое топливо</option><option>Бензин</option><option>Гибрид</option><option>Электро</option>
          </select>
          <select className="field" id="f-year" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Год">
            <option value="">Любой год</option><option>2022</option><option>2023</option>
          </select>
          <select className="field" id="f-auction" value={auction} onChange={(e) => setAuction(e.target.value)} aria-label="Аукцион">
            <option value="">Все аукционы</option><option>Copart</option><option>IAAI</option>
          </select>
        </div>
        <div className="fgroup">
          <b>Бюджет под ключ</b>
          {user
            ? <input className="field num" id="f-max" type="number" step={1000} placeholder="до, $" value={max} onChange={(e) => setMax(e.target.value)} />
            : <button className="lock-cta" onClick={() => openLogin()}>Войдите, чтобы фильтровать по цене</button>}
        </div>
        <div className="fgroup"><button className="btn btn-line btn-sm" onClick={reset}>Сбросить фильтры</button></div>
      </aside>

      <div>
        <div className="toolbar">
          <div className="row">
            <button className="btn btn-dark btn-sm fl-toggle" onClick={() => setOpen((o) => !o)}>{open ? "Скрыть фильтры" : "Фильтры"}</button>
            <b className="num">Найдено: {list.length}</b>
          </div>
          <div className="row">
            <select className="field" id="f-sort" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Сортировка">
              <option value="rec">Рекомендуемые</option><option value="date">Ближайшие торги</option>
              <option value="price">Цена под ключ</option><option value="year">Год: новее</option><option value="miles">Пробег: меньше</option>
            </select>
            <span className="view-sw" role="group" aria-label="Вид">
              <button aria-pressed={view === "grid"} onClick={() => setView("grid")}>Плитка</button>
              <button aria-pressed={view === "list"} onClick={() => setView("list")}>Таблица</button>
            </span>
          </div>
        </div>

        {!list.length ? (
          <div className="panel empty">
            <b>Под эти фильтры лотов нет</b>
            <span>Попробуйте расширить бюджет или выбрать другую марку.</span>
            <button className="btn btn-line btn-sm" onClick={reset}>Сбросить фильтры</button>
          </div>
        ) : view === "grid" ? (
          <div className="grid">{list.map((l) => <LotCard key={l.id} lot={l} />)}</div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Фото</th><th>Автомобиль</th><th>Лот</th><th>Пробег</th><th>Двигатель</th><th>Повреждение</th><th>Цена</th><th className="r">Торги</th></tr></thead>
              <tbody>
                {list.map((l) => (
                  <tr key={l.id}>
                    <td><Link href={`/lot/${l.slug}`} className="thumb" aria-label={`${l.make} ${l.model}`}><CarArt lot={l} /></Link></td>
                    <td><Link href={`/lot/${l.slug}`}><b>{l.year} {l.make} {l.model}</b></Link><div className="note">{l.trim}</div><LotBadge lot={l} /></td>
                    <td className="mono">{l.auction}<br />{l.lotNo}</td>
                    <td className="num">{kmStr(l.miles)}</td>
                    <td>{engineStr(l.cc, l.hp)}</td>
                    <td className={l.level === "light" ? "dmg-light" : "dmg-mid"}>{l.damage}</td>
                    <td><TurnkeyPrice lot={l} /></td>
                    <td className="r"><CardTimer offsetDays={l.saleOffsetDays} active={l.status === "active"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
