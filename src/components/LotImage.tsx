"use client";

import { useState } from "react";
import type { Lot } from "@/lib/types";
import { CarArt } from "./CarArt";

type ImgLot = Pick<Lot, "body" | "zone" | "color" | "year" | "make" | "model"> & { photos?: string[] };

/** Фото лота с аукциона; если фото нет или оно не загрузилось — рисованная заглушка. */
export function LotImage({ lot, index = 0, view, eager }: { lot: ImgLot; index?: number; view?: number; eager?: boolean }) {
  const src = lot.photos?.[index];
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return <CarArt lot={lot} view={view ?? index % 4} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`${lot.year} ${lot.make} ${lot.model}${index ? `, фото ${index + 1}` : ""}`}
      loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" className="lot-img"
      onError={() => setFailed(src)} />
  );
}
