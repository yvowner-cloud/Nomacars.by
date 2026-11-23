"use client";

import { useState } from "react";
import { photoCandidates } from "@/lib/photo-url";

type ImgLot = { year: number; make: string; model: string; photos?: string[] };

/**
 * Фото лота с аукциона. Сначала пробуем фото в большом размере, при ошибке — исходный адрес,
 * для карточек — следующее фото лота. Пока грузится — мягкая подложка, загруженное фото плавно проявляется.
 * Если не открылось ничего — нейтральная плашка «Фото появится позже».
 */
export function LotImage({ lot, index = 0, eager }: { lot: ImgLot; index?: number; view?: number; eager?: boolean }) {
  const candidates = photoCandidates(lot.photos, index, index === 0);
  const key = candidates.join("|");
  const [state, setState] = useState<{ key: string; i: number; loaded: boolean }>({ key, i: 0, loaded: false });
  const cur = state.key === key ? state : { key, i: 0, loaded: false };
  const src = candidates[cur.i];

  if (!src) {
    return (
      <span className="no-photo" role="img" aria-label={`${lot.year} ${lot.make} ${lot.model}: фото появится позже`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" /></svg>
        <span>Фото появится позже</span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={src} src={src} alt={`${lot.year} ${lot.make} ${lot.model}${index ? `, фото ${index + 1}` : ""}`}
      loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer"
      className={`lot-img${cur.loaded ? " is-loaded" : ""}`}
      ref={(el) => { if (el && el.complete && el.naturalWidth > 0 && !cur.loaded) setState({ key, i: cur.i, loaded: true }); }}
      onLoad={(e) => {
        // «пустышка» 1×1 или крошечная заглушка аукциона — считаем ошибкой и пробуем следующий вариант
        if (e.currentTarget.naturalWidth < 40) setState({ key, i: cur.i + 1, loaded: false });
        else setState({ key, i: cur.i, loaded: true });
      }}
      onError={() => setState({ key, i: cur.i + 1, loaded: false })} />
  );
}
