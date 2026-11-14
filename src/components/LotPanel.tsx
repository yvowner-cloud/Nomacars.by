"use client";

import Link from "next/link";
import { useState } from "react";
import type { Lot } from "@/lib/types";
import { CarArt } from "./CarArt";
import { useApp } from "./Providers";
import { WatchButton } from "./Price";
import { BigCountdown } from "./Timer";
import { calcTurnkey } from "@/lib/calc";
import { fmt, money } from "@/lib/format";
import { LotBadge } from "./LotCard";

const VIEWS = ["Слева", "Справа", "Повреждение", "Общий план"];

export function LotGallery({ lot }: { lot: Lot }) {
  const [v, setV] = useState(0);
  return (
    <div>
      <div className="gal-main ph">
        <CarArt lot={lot} view={v} />
        <div className="badges"><LotBadge lot={lot} /></div>
        <span className="lotno mono">{VIEWS[v]} · фото {v + 1}/4</span>
      </div>
      <div className="thumbs">
        {VIEWS.map((name, i) => (
          <button key={name} aria-pressed={v === i} onClick={() => setV(i)} aria-label={`Фото: ${name}`}>
            <CarArt lot={lot} view={i} /><span>{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BidBox({ lot }: { lot: Lot }) {
  const { user, country, setCountry, openLogin, toast } = useApp();
  const c = calcTurnkey(lot, country);
  const active = lot.status === "active";

  const want = () => {
    const go = () => toast("Заявка принята, менеджер свяжется с вами в течение 30 минут. Кабинет и заявки появятся на этапе 4.");
    if (user) go(); else openLogin(go);
  };

  return (
    <div className="panel bidbox">
      <div className="panel-h">{active ? "Информация о торгах" : "Торги завершены"}</div>
      <div className="box">
        {active && <BigCountdown offsetDays={lot.saleOffsetDays} />}
        <div>
          <div className="bid-row"><span>{lot.status === "sold" ? "Цена выкупа" : lot.status === "ended" ? "Цена выкупа" : "Текущая ставка"}</span>
            {lot.status === "ended" ? <span className="muted">не раскрыта</span> : user || lot.status === "active"
              ? <b className="num">{money(lot.price)}</b>
              : <button className="lock-cta" onClick={() => openLogin()}>Войти, чтобы увидеть</button>}
          </div>
          <div className="bid-row"><span>Аукцион · лот</span><span className="mono">{lot.auction} · {lot.lotNo}</span></div>
          {lot.status === "sold" && <div className="bid-row"><span>Статус</span><span style={{ color: "var(--green)", fontWeight: 700 }}>Продан</span></div>}
        </div>

        {active && (user ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3>Расчёт под ключ</h3>
              <span className="seg" role="group" aria-label="Страна">
                <button aria-pressed={country === "by"} onClick={() => setCountry("by")}>Беларусь</button>
                <button aria-pressed={country === "ru"} onClick={() => setCountry("ru")}>Россия</button>
              </span>
            </div>
            <div>
              {c.lines.map((x) => (
                <div className="cl" key={x.label}><div>{x.label}<small>{x.note}</small></div><div className="v num">{money(x.usd)}</div></div>
              ))}
              <div className="cl total"><div><b>Итого под ключ</b><small>≈ {fmt(c.local)} {c.currency} · срок {c.days}</small></div><div className="v num">{money(c.total)}</div></div>
            </div>
            <p className="note" style={{ margin: 0 }}>Расчёт по текущей ставке. Ориентировочно, точную сумму фиксирует менеджер.</p>
          </>
        ) : (
          <div style={{ background: "var(--surface2)", border: "1px solid var(--line)", padding: 14, display: "grid", gap: 8 }}>
            <span className="pval blur" aria-hidden="true">$ 00 000</span>
            <b>Цена под ключ и подробный расчёт</b>
            <span className="note">Войдите по номеру телефона. Это бесплатно и займёт минуту.</span>
            <button className="btn btn-red" onClick={() => openLogin()}>Войти и увидеть цену</button>
          </div>
        ))}

        {active ? (
          <div style={{ display: "grid", gap: 8 }}>
            <button className="btn btn-red btn-block" onClick={want}>Хочу эту машину</button>
            <WatchButton id={lot.id} big />
            <span className="note">Предоплата не нужна. Счёт выставляется после выигрыша торгов.</span>
          </div>
        ) : (
          <Link className="btn btn-dark" href="/catalog">Смотреть актуальные лоты</Link>
        )}
      </div>
    </div>
  );
}

export function LotTabs({ ai, specs }: { ai: React.ReactNode; specs: React.ReactNode }) {
  const [t, setT] = useState<"ai" | "specs">("ai");
  return (
    <div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={t === "ai"} onClick={() => setT("ai")}>Разбор ИИ</button>
        <button role="tab" aria-selected={t === "specs"} onClick={() => setT("specs")}>Характеристики</button>
      </div>
      <div className="panel" style={{ borderTop: 0, borderRadius: "0 0 4px 4px" }}>{t === "ai" ? ai : specs}</div>
    </div>
  );
}
