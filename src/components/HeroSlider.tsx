"use client";

import { useEffect, useState } from "react";
import type { Lot } from "@/lib/types";
import { CarArt } from "./CarArt";

const SLIDES = [
  { h: "Авто из США под ключ в Беларусь и Россию", p: "Проходные машины 3–5 лет с аукционов Copart и IAAI." },
  { h: "Лучшие лоты недели отбирает Nomacars", p: "Без утопленников, пожаров и проблем с документами." },
  { h: "Честный расчёт до последнего доллара", p: "Пошлина, утильсбор, доставка и наши услуги отдельными строками." },
];

/** Слайдер главной. Заглушки-«площадки» с машинами; на этапе 8 — реальные фото. */
export function HeroSlider({ lots }: { lots: Lot[] }) {
  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);
  useEffect(() => {
    if (pause || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [pause]);

  return (
    <section className="slider" aria-roledescription="карусель" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
      {SLIDES.map((s, k) => (
        <div key={s.h} className={`slide${k === i ? " on" : ""}`} aria-hidden={k !== i}>
          <div className="slide-yard">
            {lots.slice(k * 4, k * 4 + 4).map((l) => <CarArt key={l.id} lot={l} view={k % 2} />)}
          </div>
          <div className="slide-box">
            {k === 0 ? <h1>{s.h}</h1> : <h2 style={{ fontSize: "clamp(32px,5vw,54px)", lineHeight: 1.02 }}>{s.h}</h2>}
            <p>{s.p}</p>
          </div>
        </div>
      ))}
      <div className="dots">
        {SLIDES.map((s, k) => (
          <button key={s.h} aria-label={`Слайд ${k + 1}`} aria-pressed={k === i} onClick={() => setI(k)} />
        ))}
      </div>
    </section>
  );
}
