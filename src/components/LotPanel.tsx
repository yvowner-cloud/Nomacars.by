"use client";

import Link from "next/link";
import { useState } from "react";
import type { CalcResult, Country } from "@/lib/types";
import type { PublicLot } from "@/lib/server/public-lots";
import { LotImage } from "./LotImage";
import { useApp } from "./Providers";
import { WatchButton } from "./Price";
import { BigCountdown } from "./Timer";
import { fmt, money } from "@/lib/format";
import { LotBadge } from "./LotCard";
import { WantButton } from "./LeadForms";

const VIEWS = ["Слева", "Справа", "Повреждение", "Общий план"];

export function LotGallery({ lot }: { lot: PublicLot }) {
  const [v, setV] = useState(0);
  const photos = lot.photos ?? [];
  const count = photos.length || VIEWS.length;
  const label = photos.length ? `фото ${v + 1}/${count}` : `${VIEWS[v]} · фото ${v + 1}/4`;
  const go = (d: number) => setV((x) => (x + d + count) % count);
  return (
    <div>
      <div className="gal-main ph">
        <LotImage lot={lot} index={v} eager />
        <div className="badges"><LotBadge lot={lot} /></div>
        {count > 1 && <>
          <button className="gal-nav gal-prev" onClick={() => go(-1)} aria-label="Предыдущее фото">‹</button>
          <button className="gal-nav gal-next" onClick={() => go(1)} aria-label="Следующее фото">›</button>
        </>}
        <span className="lotno mono">{label}</span>
      </div>
      <div className={`thumbs${photos.length > 4 ? " thumbs-many" : ""}`}>
        {Array.from({ length: count }, (_, i) => (
          <button key={i} aria-pressed={v === i} onClick={() => setV(i)} aria-label={`Фото ${i + 1}`}>
            <LotImage lot={lot} index={i} />{!photos.length && <span>{VIEWS[i]}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BidBox({ lot, calc }: { lot: PublicLot; calc: Record<Country, CalcResult> | null }) {
  const { user, country, setCountry, openLogin } = useApp();
  const c = calc?.[country] ?? null;
  const active = lot.status === "active";

  return (
    <div className="panel bidbox">
      <div className="panel-h">{active ? "Информация о торгах" : "Торги завершены"}</div>
      <div className="box">
        {active && <BigCountdown at={lot.saleAt} />}
        <div>
          <div className="bid-row"><span>{lot.status === "sold" ? "Цена выкупа" : lot.status === "ended" ? "Цена выкупа" : "Текущая ставка"}</span>
            {lot.status === "ended" ? <span className="muted">не раскрыта</span>
              : active ? <b className="num">{money(lot.bid ?? 0)}</b>
              : lot.soldPrice !== null ? <b className="num">{money(lot.soldPrice)}</b>
              : <button className="lock-cta" onClick={() => openLogin()}>Войти, чтобы увидеть</button>}
          </div>
          <div className="bid-row"><span>Аукцион · лот</span><span className="mono">{lot.auction} · {lot.lotNo}</span></div>
          {lot.status === "sold" && <div className="bid-row"><span>Статус</span><span style={{ color: "var(--green)", fontWeight: 700 }}>Продан</span></div>}
        </div>

        {active && (user && c ? (
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
            <WantButton lotId={lot.id} title={`${lot.year} ${lot.make} ${lot.model} ${lot.trim}`} bid={lot.bid ?? 0} />
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
        <button role="tab" aria-selected={t === "ai"} onClick={() => setT("ai")}>Разбор Nomacars</button>
        <button role="tab" aria-selected={t === "specs"} onClick={() => setT("specs")}>Характеристики</button>
      </div>
      <div className="panel" style={{ borderTop: 0, borderRadius: "0 0 4px 4px" }}>{t === "ai" ? ai : specs}</div>
    </div>
  );
}
