import { fmt, money } from "@/lib/format";
import type { CalcResult, Country, Route } from "@/lib/types";

const COLS = "minmax(0,1fr) 84px 84px";
const R = { textAlign: "right" as const, whiteSpace: "nowrap" as const };

/** Расчёт под ключ сразу по двум маршрутам: Клайпеда и Поти — строки рядом, итог и срок по каждому. */
export function RouteCompare({ r, country }: { r: Record<Route, CalcResult>; country: Country }) {
  const k = r.klaipeda, p = r.poti;
  const cheaper: Route | null = Math.round(k.total) === Math.round(p.total) ? null : k.total < p.total ? "klaipeda" : "poti";
  const city = country === "by" ? "Минск" : "Москва";
  const label = (i: number, l: string) => (i === 4 ? `Автовоз до: ${city}` : l);
  const note = (i: number, n: string) => (i === 3 ? "контейнер до порта" : i === 4 ? "из порта" : n);

  return (
    <div className="route-compare">
      <div className="cl" style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, fontWeight: 700, fontSize: 12.5, color: "var(--muted)" }}>
        <div />
        <div style={R}>Клайпеда</div>
        <div style={R}>Поти</div>
      </div>
      {k.lines.map((x, i) => (
        <div className="cl" key={x.label} style={{ display: "grid", gridTemplateColumns: COLS, gap: 8 }}>
          <div>{label(i, x.label)}<small>{note(i, x.note)}</small></div>
          <div className="num" style={{ ...R, fontWeight: 700 }}>{money(x.usd)}</div>
          <div className="num" style={{ ...R, fontWeight: 700 }}>{money(p.lines[i]?.usd ?? 0)}</div>
        </div>
      ))}
      <div className="cl total" style={{ display: "grid", gridTemplateColumns: COLS, gap: 8 }}>
        <div><b>Итого под ключ</b></div>
        {([k, p] as const).map((c) => (
          <div className="v num" key={c.route} style={{ ...R, fontSize: 17, ...(c.route === cheaper ? { color: "var(--green)" } : {}) }}>
            {money(c.total)}
            <small style={{ display: "block", fontWeight: 400 }}>≈ {fmt(c.local)} {c.currency}</small>
            <small style={{ display: "block", fontWeight: 400 }}>{c.days}</small>
          </div>
        ))}
      </div>
      {cheaper && (
        <p className="note" style={{ margin: "6px 0 0" }}>
          Выгоднее через {cheaper === "klaipeda" ? "Клайпеду" : "Поти"} на {money(Math.abs(k.total - p.total))}. Маршрут выбираете вы — менеджер подскажет, что быстрее сейчас.
        </p>
      )}
    </div>
  );
}
