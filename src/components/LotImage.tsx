"use client";

import { useState } from "react";

type ImgLot = { year: number; make: string; model: string; photos?: string[] };

/** Фото лота с аукциона. Если фото нет или оно не загрузилось — нейтральная плашка (без рисованных машин). */
export function LotImage({ lot, index = 0, eager }: { lot: ImgLot; index?: number; view?: number; eager?: boolean }) {
  const src = lot.photos?.[index];
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) {
    return (
      <span className="no-photo" role="img" aria-label={`${lot.year} ${lot.make} ${lot.model}: фото появится позже`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" /></svg>
        <span>Фото появится позже</span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`${lot.year} ${lot.make} ${lot.model}${index ? `, фото ${index + 1}` : ""}`}
      loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" className="lot-img"
      onError={() => setFailed(src)} />
  );
}
