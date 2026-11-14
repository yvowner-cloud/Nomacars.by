"use client";

import { useApp } from "./Providers";
import { calcTurnkey } from "@/lib/calc";
import { money } from "@/lib/format";
import type { Lot } from "@/lib/types";

/** Цена «под ключ» на карточке: гостю — размытая заглушка и кнопка входа. */
export function TurnkeyPrice({ lot }: { lot: Lot }) {
  const { user, country, openLogin, ready } = useApp();
  if (lot.status === "ended") {
    return (<div><div className="plabel">Цена выкупа</div><div className="muted" style={{ fontWeight: 700 }}>не раскрыта</div></div>);
  }
  const label = lot.status === "sold" ? "Продан за" : `Под ключ в ${country === "by" ? "РБ" : "РФ"}`;
  if (!ready || !user) {
    return (
      <div>
        <div className="plabel">{label}</div>
        <div className="pval blur" aria-hidden="true">$ 00 000</div>
        <button className="lock-cta" onClick={(e) => { e.preventDefault(); openLogin(); }}>
          {lot.status === "sold" ? "Войти, чтобы увидеть" : "Войти и увидеть цену"}
        </button>
      </div>
    );
  }
  const v = lot.status === "sold" ? lot.price : calcTurnkey(lot, country).total;
  return (<div><div className="plabel">{label}</div><div className="pval num">{money(v)}</div></div>);
}

export function WatchButton({ id, big }: { id: number; big?: boolean }) {
  const { watch, toggleWatch } = useApp();
  const on = watch.includes(id);
  if (big) {
    return (
      <button className="btn btn-line btn-block" aria-pressed={on} onClick={() => toggleWatch(id)}>
        {on ? "★ В избранном" : "☆ Следить за лотом"}
      </button>
    );
  }
  return (
    <button className="watch" aria-pressed={on} aria-label={on ? "Убрать из избранного" : "В избранное"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatch(id); }}>
      {on ? "★" : "☆"}
    </button>
  );
}
