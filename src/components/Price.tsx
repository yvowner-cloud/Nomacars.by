"use client";

import { useApp } from "./Providers";
import { money } from "@/lib/format";
import type { PublicLot } from "@/lib/server/public-lots";

/** Цена на карточке. Цифры приходят с сервера только вошедшим; гость видит заглушку и кнопку входа. */
export function TurnkeyPrice({ lot }: { lot: PublicLot }) {
  const { country, openLogin } = useApp();
  if (lot.status === "ended") {
    return (<div><div className="plabel">Цена выкупа</div><div className="muted" style={{ fontWeight: 700 }}>не раскрыта</div></div>);
  }
  const sold = lot.status === "sold";
  const label = sold ? "Продан за" : `Под ключ в ${country === "by" ? "РБ" : "РФ"} от`;
  const value = sold ? lot.soldPrice : lot.turnkey?.[country] ?? null;
  if (value === null) {
    return (
      <div>
        <div className="plabel">{label}</div>
        <div className="pval blur" aria-hidden="true">$ 00 000</div>
        <button className="lock-cta" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openLogin(); }}>
          {sold ? "Войти, чтобы увидеть" : "Войти и увидеть цену"}
        </button>
      </div>
    );
  }
  return (<div><div className="plabel">{label}</div><div className="pval num">{money(value)}</div></div>);
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
