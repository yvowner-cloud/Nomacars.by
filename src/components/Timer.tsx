"use client";

import { useEffect, useState } from "react";
import { DAY } from "@/lib/lots";

/** Отсчёт до торгов. Рендерится только в браузере, чтобы не было расхождений с сервером. */
function useNow(interval = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

const saleAt = (offsetDays: number, base: number) => {
  // торги в 17:00 по Минску (14:00 UTC) — демо
  const d = new Date(base + offsetDays * DAY);
  d.setUTCHours(14, 0, 0, 0);
  return d;
};

export function CardTimer({ offsetDays, active }: { offsetDays: number; active: boolean }) {
  const now = useNow(60_000);
  if (now === null) return <div className="timer">&nbsp;<b>&nbsp;</b></div>;
  const d = saleAt(offsetDays, now);
  const label = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  if (!active) return <div className="timer">Торги прошли<b>{label}</b></div>;
  const left = d.getTime() - now;
  const days = Math.floor(left / DAY);
  const hours = Math.floor((left % DAY) / 3_600_000);
  return (
    <div className={`timer${days < 3 ? " soon" : ""}`}>
      Торги {label}
      <b>{days > 0 ? `${days} дн ${hours} ч` : `${hours} ч`}</b>
    </div>
  );
}

export function BigCountdown({ offsetDays }: { offsetDays: number }) {
  const now = useNow(1000);
  if (now === null) return <div className="countdown"><b>--:--:--</b><span>до начала торгов</span></div>;
  const d = saleAt(offsetDays, now);
  const left = Math.max(0, d.getTime() - now);
  const days = Math.floor(left / DAY);
  const h = Math.floor((left % DAY) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="countdown">
      <b>{days} д {p(h)}:{p(m)}:{p(s)}</b>
      <span>до торгов · {d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}, 17:00 по Минску</span>
    </div>
  );
}
