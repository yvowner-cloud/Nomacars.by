"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PublicLot } from "@/lib/server/public-lots";
type Lot = PublicLot;
import { LotBadge, LotCard } from "./LotCard";
import { LotImage } from "./LotImage";
import { TurnkeyPrice, WatchButton } from "./Price";
import { CardTimer } from "./Timer";
import { useApp } from "./Providers";
import { engineStr, fmt, toKm } from "@/lib/format";
import { stateInfo } from "@/lib/geo";

export interface Initial { q?: string; make?: string; body?: string; fuel?: string; auction?: string; top?: string; watch?: string; sort?: string }
type Sort = "rec" | "date" | "price" | "year" | "miles";

const EMPTY = { q: "", lotNo: "", make: "", model: "", auction: "", body: "", fuel: "", kmMin: "", kmMax: "", scoreMin: "", scoreMax: "", yearMin: "", yearMax: "", maxPrice: "", top: false, light: false, watch: false };
type F = typeof EMPTY;

export function CatalogView({ lots, initial }: { lots: Lot[]; initial: Initial }) {
  const { user, country, watch, openLogin } = useApp();
  const [f, setF] = useState<F>({ ...EMPTY, q: initial.q ?? "", make: initial.make ?? "", body: initial.body ?? "", fuel: initial.fuel ?? "", auction: initial.auction ?? "", top: initial.top === "1", watch: initial.watch === "1" });
  const [sort, setSort] = useState<Sort>((["rec", "date", "price", "year", "miles"].includes(initial.sort ?? "") ? initial.sort : "rec") as Sort);
  const [per, setPer] = useState(20);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "grid">("list");
  const [open, setOpen] = useState(false);
  const set = <K extends keyof F>(k: K, v: F[K]) => setF((s) => ({ ...s, [k]: v, ...(k === "make" ? { model: "" } : {}) }));

  const total = (l: Lot) => l.turnkey?.[country] ?? Number.POSITIVE_INFINITY;
  const makes = useMemo(() => [...new Set(lots.map((l) => l.make))].sort(), [lots]);
  const models = useMemo(() => [...new Set(lots.filter((l) => !f.make || l.make === f.make).map((l) => l.model))].sort(), [lots, f.make]);

  const list = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const n = (v: string) => (v === "" ? null : Number(v));
    const r = lots.filter((l) => {
      const km = toKm(l.miles);
      return (!q || `${l.year} ${l.make} ${l.model} ${l.trim} ${l.vin}`.toLowerCase().includes(q)) &&
        (!f.lotNo || l.lotNo.includes(f.lotNo.trim())) &&
        (!f.make || l.make === f.make) && (!f.model || l.model === f.model) &&
        (!f.auction || l.auction === f.auction) && (!f.body || l.body === f.body) && (!f.fuel || l.fuel === f.fuel) &&
        (n(f.kmMin) === null || km >= n(f.kmMin)!) && (n(f.kmMax) === null || km <= n(f.kmMax)!) &&
        (n(f.scoreMin) === null || l.aiScore >= n(f.scoreMin)!) && (n(f.scoreMax) === null || l.aiScore <= n(f.scoreMax)!) &&
        (n(f.yearMin) === null || l.year >= n(f.yearMin)!) && (n(f.yearMax) === null || l.year <= n(f.yearMax)!) &&
        (!f.top || l.top) && (!f.light || l.level === "light") && (!f.watch || watch.includes(l.id)) &&
        (!f.maxPrice || !user || total(l) <= Number(f.maxPrice));
    });
    const cmp: Record<Sort, (a: Lot, b: Lot) => number> = {
      rec: (a, b) => Number(b.top) - Number(a.top) || b.aiScore - a.aiScore,
      date: (a, b) => Date.parse(a.saleAt) - Date.parse(b.saleAt),
      price: (a, b) => total(a) - total(b),
      year: (a, b) => b.year * 12 + b.month - (a.year * 12 + a.month),
      miles: (a, b) => a.miles - b.miles,
    };
    return r.sort(cmp[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lots, f, sort, country, user, watch]);

  useEffect(() => setPage(1), [f, sort, per]);
  const pages = Math.max(1, Math.ceil(list.length / per));
  const shown = list.slice((page - 1) * per, page * per);
  const reset = () => setF(EMPTY);

  const row = (label: string, el: React.ReactNode) => (<div className="gs-row"><span>{label}</span>{el}</div>);

  return (
    <div className="cat">
      <div>
        <button className="btn btn-dark btn-block fl-toggle" style={{ marginBottom: 8 }} onClick={() => setOpen((o) => !o)}>{open ? "Скрыть поиск" : "Глобальный поиск и фильтры"}</button>
        <form className={`gs${open ? "" : " closed"}`} onSubmit={(e) => { e.preventDefault(); setOpen(false); }} aria-label="Глобальный поиск">
          <div className="gs-h"><h2>Глобальный поиск</h2><button type="button" className="btn btn-red btn-sm" onClick={reset}>Сброс</button></div>
          {row("Поиск", <input className="field" id="gs-q" placeholder="Год, марка, модель или VIN" value={f.q} onChange={(e) => set("q", e.target.value)} />)}
          {row("Лот №", <input className="field" id="gs-lot" placeholder="- Все -" inputMode="numeric" value={f.lotNo} onChange={(e) => set("lotNo", e.target.value)} />)}
          {row("Марка", <select className="field" id="gs-make" value={f.make} onChange={(e) => set("make", e.target.value)}><option value="">- Все -</option>{makes.map((m) => <option key={m}>{m}</option>)}</select>)}
          {row("Модель", <select className="field" id="gs-model" value={f.model} onChange={(e) => set("model", e.target.value)}><option value="">- Все -</option>{models.map((m) => <option key={m}>{m}</option>)}</select>)}
          {row("Аукцион", <select className="field" id="gs-auction" value={f.auction} onChange={(e) => set("auction", e.target.value)}><option value="">- Все -</option><option>Copart</option><option>IAAI</option><option>Manheim</option></select>)}
          {row("Кузов", <select className="field" id="gs-body" value={f.body} onChange={(e) => set("body", e.target.value)}><option value="">- Все -</option><option value="suv">Кроссовер / SUV</option><option value="sedan">Седан</option></select>)}
          {row("Топливо", <select className="field" id="gs-fuel" value={f.fuel} onChange={(e) => set("fuel", e.target.value)}><option value="">- Все -</option><option>Бензин</option><option>Гибрид</option><option>Электро</option></select>)}
          {row("Пробег", <div className="gs-pair"><input className="field num" id="gs-kmmin" inputMode="numeric" placeholder="От, км" value={f.kmMin} onChange={(e) => set("kmMin", e.target.value)} /><input className="field num" id="gs-kmmax" inputMode="numeric" placeholder="До, км" value={f.kmMax} onChange={(e) => set("kmMax", e.target.value)} /></div>)}
          {row("Оценка", <div className="gs-pair"><input className="field num" id="gs-smin" inputMode="numeric" placeholder="От" value={f.scoreMin} onChange={(e) => set("scoreMin", e.target.value)} /><input className="field num" id="gs-smax" inputMode="numeric" placeholder="До" value={f.scoreMax} onChange={(e) => set("scoreMax", e.target.value)} /></div>)}
          {row("Год", <div className="gs-pair"><input className="field num" id="gs-ymin" inputMode="numeric" placeholder="От" value={f.yearMin} onChange={(e) => set("yearMin", e.target.value)} /><input className="field num" id="gs-ymax" inputMode="numeric" placeholder="До" value={f.yearMax} onChange={(e) => set("yearMax", e.target.value)} /></div>)}
          {row("Бюджет", user
            ? <input className="field num" id="gs-price" inputMode="numeric" placeholder="Под ключ до, $" value={f.maxPrice} onChange={(e) => set("maxPrice", e.target.value)} />
            : <button type="button" className="lock-cta" onClick={() => openLogin()}>Войдите для фильтра по цене</button>)}
          <label className="gs-chk"><input type="checkbox" checked={f.top} onChange={(e) => set("top", e.target.checked)} /><span>Только «Топ недели»</span></label>
          <label className="gs-chk"><input type="checkbox" checked={f.light} onChange={(e) => set("light", e.target.checked)} /><span>Только лёгкие повреждения</span></label>
          <label className="gs-chk"><input type="checkbox" checked={f.watch} onChange={(e) => set("watch", e.target.checked)} /><span>Избранное ({watch.length})</span></label>
          <div className="gs-btns"><button className="btn btn-red" type="submit">Показать</button><button className="btn btn-red" type="button" onClick={reset}>Сброс</button></div>
        </form>
      </div>

      <div>
        <div className="res-top">
          <Pager page={page} pages={pages} onPage={setPage} />
          <div className="res-bar">
            <span className="num">Показано {list.length ? (page - 1) * per + 1 : 0}–{Math.min(page * per, list.length)} из {list.length}</span>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <label className="row">Сортировка <select id="gs-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="rec">Рекомендуемые</option><option value="date">Ближайшие торги</option><option value="price">Цена под ключ</option><option value="year">Год: новее</option><option value="miles">Пробег: меньше</option>
              </select></label>
              <label className="row">На странице <select id="gs-per" value={per} onChange={(e) => setPer(Number(e.target.value))}><option>10</option><option>20</option><option>50</option></select></label>
              <span className="view-sw" role="group" aria-label="Вид">
                <button aria-pressed={view === "list"} onClick={() => setView("list")}>Список</button>
                <button aria-pressed={view === "grid"} onClick={() => setView("grid")}>Плитка</button>
              </span>
            </div>
          </div>
        </div>

        {!shown.length ? (
          <div className="panel empty">
            <b>Под эти условия лотов нет</b>
            <span>Попробуйте расширить диапазон пробега или года, либо выбрать другую марку.</span>
            <button className="btn btn-red btn-sm" onClick={reset}>Сбросить поиск</button>
          </div>
        ) : view === "grid" ? (
          <div className="grid">{shown.map((l) => <LotCard key={l.id} lot={l} />)}</div>
        ) : (
          <div className="rows">
            {shown.map((l) => (
              <Link key={l.id} href={`/lot/${l.slug}`} className="lrow">
                <span className="thumb"><LotImage lot={l} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="lrow-t">{l.year} {l.make} {l.model} {l.trim} <LotBadge lot={l} /></div>
                  <div className="lrow-m">
                    <span>Пробег: <b className="num">{fmt(toKm(l.miles))} км</b></span>
                    <span>Оценка Ncars: <b>{l.aiScore}</b></span>
                    <span>Двигатель: <b>{engineStr(l.cc, l.hp, l.hpEstimated)}</b></span>
                  </div>
                  <div className="lrow-m">
                    <span>{l.conditionGrade != null ? <>Состояние: <b className="dmg-light">CR {l.conditionGrade.toFixed(1)}</b>{l.damage !== "Без повреждений" && <> · {l.damage}</>}</> : <>Повреждение: <b className={l.level === "light" ? "dmg-light" : "dmg-mid"}>{l.damage}</b></>}</span>
                  </div>
                  <div className="lrow-m">
                    <span>Лот №: <b className="num">{l.lotNo}</b></span>
                    <span><b>{l.auction}</b></span>
                    <span><b>{stateInfo(l.state).name}</b></span>
                  </div>
                </div>
                <div className="lrow-r">
                  <TurnkeyPrice lot={l} />
                  <CardTimer at={l.saleAt} active={l.status === "active"} />
                  <span style={{ position: "relative", width: 32, height: 32 }}><WatchButton id={l.id} /></span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {pages > 1 && <div style={{ marginTop: 14 }}><Pager page={page} pages={pages} onPage={setPage} /></div>}
        <p className="note" style={{ marginTop: 12 }}>Пробег пересчитан из миль в километры и округлён. Цены под ключ ориентировочные.</p>
      </div>
    </div>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => Math.abs(n - page) <= 2 || n === 1 || n === pages);
  return (
    <nav className="pager" aria-label="Страницы">
      <button disabled={page === 1} onClick={() => onPage(1)} aria-label="Первая">«</button>
      <button disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Предыдущая">‹</button>
      {nums.map((n) => <button key={n} aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)}>{n}</button>)}
      <button disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Следующая">›</button>
      <button disabled={page === pages} onClick={() => onPage(pages)} aria-label="Последняя">»</button>
    </nav>
  );
}
