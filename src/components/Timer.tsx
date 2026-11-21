"use client";

import { useEffect, useState } from "react";
import { DAY } from "@/lib/time";

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

export function CardTimer({ at, active }: { at: string; active: boolean }) {
  const now = useNow(60_000);
  if (now === null) return <div className="timer">&nbsp;<b>&nbsp;</b></div>;
  const d = new Date(at);
  const label = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  if (!active) return <div className="timer">Торги прошли<b>{label}</b></div>;
  const left = d.getTime() - now;
  if (left <= 0) return <div className="timer soon">Торги<b>идут</b></div>;
  const days = Math.floor(left / DAY);
  const hours = Math.floor((left % DAY) / 3_600_000);
  return (
    <div className={`timer${days < 3 ? " soon" : ""}`}>
      Торги {label}
      <b>{days > 0 ? `${days} дн ${hours} ч` : `${hours} ч ${Math.floor((left % 3_600_000) / 60_000)} мин`}</b>
    </div>
  );
}

/** Компактный отсчёт «2 д 04:12:09» — для живого лота на главной. */
export function LiveCountdown({ at, className }: { at: string; className?: string }) {
  const now = useNow(1000);
  if (now === null) return <div className={className}>--:--:--</div>;
  const left = Math.max(0, new Date(at).getTime() - now);
  if (left === 0) return <div className={className}>идут</div>;
  const p = (n: number) => String(n).padStart(2, "0");
  const d = Math.floor(left / DAY), h = Math.floor((left % DAY) / 3_600_000), m = Math.floor((left % 3_600_000) / 60_000), s = Math.floor((left % 60_000) / 1000);
  return <div className={className}>{d > 0 ? `${d} д ` : ""}{p(h)}:{p(m)}:{p(s)}</div>;
}

export function BigCountdown({ at }: { at: string }) {
  const now = useNow(1000);
  if (now === null) return <div className="countdown"><b>--:--:--</b><span>до начала торгов</span></div>;
  const d = new Date(at);
  const left = Math.max(0, d.getTime() - now);
  const days = Math.floor(left / DAY);
  const h = Math.floor((left % DAY) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  const when = d.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Minsk" });
  return (
    <div className="countdown">
      <b>{left === 0 ? "торги идут" : `${days} д ${p(h)}:${p(m)}:${p(s)}`}</b>
      <span>до торгов · {when} по Минску</span>
    </div>
  );
}
