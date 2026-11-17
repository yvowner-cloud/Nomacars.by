"use client";

import { useMemo, useState } from "react";
import { useApp } from "../Providers";

export interface ModelRow { id: number; make: string; model: string; tier: "A" | "B" | "C"; target: number; active: boolean; onSite: number; need: number }
interface Data { rows: ModelRow[]; unmatched: { make: string; model: string; count: number }[] }

const TIER_LABEL = { A: "A — хит", B: "B — ходовая", C: "C — линейка" } as const;

/** Вкладка «Модели»: какие модели нужны на сайте, сколько есть и чего не хватает. */
export function ModelsAdmin({ initial, readOnly }: { initial: Data; readOnly: boolean }) {
  const { toast } = useApp();
  const [data, setData] = useState<Data>(initial);
  const [make, setMake] = useState("");
  const [tier, setTier] = useState("");
  const [onlyNeed, setOnlyNeed] = useState(false);
  const [bulk, setBulk] = useState("");
  const [add, setAdd] = useState({ make: "", model: "", tier: "B", target: "" });
  const [busy, setBusy] = useState(false);

  const call = async (url: string, method: string, payload?: unknown, ok?: string) => {
    setBusy(true);
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast(j.error || "Не удалось сохранить"); return null; }
      setData({ rows: j.rows, unmatched: j.unmatched });
      if (ok) toast(ok);
      return j;
    } finally { setBusy(false); }
  };

  const makes = useMemo(() => [...new Set(data.rows.map((r) => r.make))].sort(), [data.rows]);
  const list = data.rows.filter((r) => (!make || r.make === make) && (!tier || r.tier === tier) && (!onlyNeed || r.need > 0));
  const act = data.rows.filter((r) => r.active);
  const totals = {
    models: act.length,
    target: act.reduce((s, r) => s + r.target, 0),
    onSite: act.reduce((s, r) => s + Math.min(r.onSite, r.target), 0),
    need: act.reduce((s, r) => s + r.need, 0),
  };

  const shopping = useMemo(() => {
    const by = new Map<string, string[]>();
    for (const r of data.rows) if (r.need > 0 && (!make || r.make === make)) by.set(r.make, [...(by.get(r.make) ?? []), `${r.model} — ${r.need}`]);
    return [...by.entries()].map(([m, items]) => `${m}: ${items.join("; ")}`).join("\n");
  }, [data.rows, make]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(shopping); toast("Список скопирован"); } catch { toast("Выделите текст и скопируйте вручную"); }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        {([["Моделей в списке", totals.models], ["Цель, машин", totals.target], ["Уже на сайте", totals.onSite], ["Не хватает", totals.need]] as const).map(([l, v]) => (
          <div key={l} className="panel" style={{ padding: 14 }}><div className="note" style={{ margin: 0 }}>{l}</div><b style={{ fontSize: 26 }}>{v}</b></div>
        ))}
      </div>

      <p className="note" style={{ margin: 0 }}>
        Уровень задаёт, сколько машин модели держать на сайте: A — хиты (6), B — ходовые (4), C — для полноты линейки (2).
        «На сайте» считается автоматически по лотам с идущими торгами: «RAV4 Hybrid» засчитывается в RAV4, «X5 M» — в X5.
        Выключенная модель в задание не попадает.
      </p>

      <div className="lead-filters">
        <select className="field" value={make} onChange={(e) => setMake(e.target.value)} aria-label="Марка" style={{ maxWidth: 220 }}>
          <option value="">Все марки</option>{makes.map((m) => <option key={m}>{m}</option>)}
        </select>
        <div className="chips" role="group" aria-label="Уровень">
          {(["", "A", "B", "C"] as const).map((t) => <button key={t} aria-pressed={tier === t} onClick={() => setTier(t)}>{t ? TIER_LABEL[t] : "Все уровни"}</button>)}
          <button aria-pressed={onlyNeed} onClick={() => setOnlyNeed((v) => !v)}>Не хватает</button>
        </div>
      </div>

      <div className="tbl-wrap"><table>
        <thead><tr><th>Вкл.</th><th>Марка</th><th>Модель</th><th>Уровень</th><th className="r">Цель</th><th className="r">На сайте</th><th className="r">Не хватает</th><th /></tr></thead>
        <tbody>{list.map((r) => (
          <tr key={r.id} style={!r.active ? { opacity: 0.5 } : undefined}>
            <td><label className="sw"><input type="checkbox" checked={r.active} disabled={readOnly || busy} aria-label="Модель нужна"
              onChange={(e) => call(`/api/admin/models/${r.id}`, "PATCH", { active: e.target.checked })} /><i /></label></td>
            <td>{r.make}</td>
            <td><b>{r.model}</b></td>
            <td><select className="field" value={r.tier} disabled={readOnly || busy} aria-label="Уровень" style={{ padding: "4px 6px" }}
              onChange={(e) => call(`/api/admin/models/${r.id}`, "PATCH", { tier: e.target.value })}>
              {(["A", "B", "C"] as const).map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
            </select></td>
            <td className="r"><input className="field" type="number" min={0} max={50} defaultValue={r.target} key={`${r.id}-${r.target}`} disabled={readOnly || busy}
              aria-label="Цель" style={{ width: 64, padding: "4px 6px", textAlign: "right" }}
              onBlur={(e) => { const v = Number(e.target.value); if (v !== r.target) call(`/api/admin/models/${r.id}`, "PATCH", { target: v }, "Цель сохранена"); }} /></td>
            <td className="r">{r.onSite}</td>
            <td className="r" style={{ color: r.need > 0 ? "var(--red, #d6001c)" : undefined, fontWeight: r.need > 0 ? 700 : undefined }}>{r.active ? r.need || "✓" : "—"}</td>
            <td>{!readOnly && <button className="btn btn-ghost" disabled={busy} style={{ padding: "4px 10px" }}
              onClick={() => { if (confirm(`Удалить ${r.make} ${r.model} из списка?`)) call(`/api/admin/models/${r.id}`, "DELETE", undefined, "Удалено"); }}>Удалить</button>}</td>
          </tr>
        ))}</tbody>
      </table></div>
      {!list.length && <div className="panel empty"><b>Ничего не найдено</b><span>Измените фильтры.</span></div>}

      <div className="panel" style={{ padding: 16, display: "grid", gap: 10 }}>
        <b>Список для захода{make ? ` · ${make}` : ""}</b>
        <span className="note" style={{ margin: 0 }}>Скопируйте и вставьте в промт подборки (блок «ЧЕГО НЕ ХВАТАЕТ»). Цифра — сколько лотов модели нужно найти.</span>
        <textarea className="field" readOnly value={shopping || "Всё укомплектовано 👍"} rows={Math.min(14, Math.max(3, shopping.split("\n").length + 1))} style={{ fontFamily: "monospace", fontSize: 13 }} />
        <div><button className="btn btn-red" onClick={copy} disabled={!shopping}>Скопировать</button></div>
      </div>

      {data.unmatched.length > 0 && (
        <div className="panel" style={{ padding: 16, display: "grid", gap: 8 }}>
          <b>На сайте есть, но модели нет в списке</b>
          <span className="note" style={{ margin: 0 }}>Эти лоты не засчитываются ни в одну модель. Если модель нужна — добавьте её ниже.</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.unmatched.map((u) => <span key={`${u.make}|${u.model}`} className="chip-tag" style={{ border: "1px solid var(--line, #333)", padding: "2px 8px" }}>{u.make} {u.model} · {u.count}</span>)}
          </div>
        </div>
      )}

      {!readOnly && (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
          <form className="panel" style={{ padding: 16, display: "grid", gap: 8 }}
            onSubmit={async (e) => { e.preventDefault(); if (await call("/api/admin/models", "POST", add, "Модель добавлена")) setAdd({ make: add.make, model: "", tier: add.tier, target: "" }); }}>
            <b>Добавить модель</b>
            <input className="field" placeholder="Марка, например BMW" value={add.make} onChange={(e) => setAdd({ ...add, make: e.target.value })} list="nc-makes" required />
            <datalist id="nc-makes">{makes.map((m) => <option key={m} value={m} />)}</datalist>
            <input className="field" placeholder="Модель, например X5" value={add.model} onChange={(e) => setAdd({ ...add, model: e.target.value })} required />
            <div style={{ display: "flex", gap: 8 }}>
              <select className="field" value={add.tier} onChange={(e) => setAdd({ ...add, tier: e.target.value })} aria-label="Уровень">
                {(["A", "B", "C"] as const).map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
              </select>
              <input className="field" type="number" min={0} max={50} placeholder="Цель" value={add.target} onChange={(e) => setAdd({ ...add, target: e.target.value })} style={{ width: 130 }} />
            </div>
            <div><button className="btn btn-red" disabled={busy}>Добавить</button></div>
          </form>

          <form className="panel" style={{ padding: 16, display: "grid", gap: 8 }}
            onSubmit={async (e) => {
              e.preventDefault();
              const j = await call("/api/admin/models", "POST", { bulk });
              if (j) { toast(`Добавлено/обновлено: ${j.ok}${j.errors?.length ? `, ошибок: ${j.errors.length}` : ""}`); if (!j.errors?.length) setBulk(""); else alert(j.errors.join("\n")); }
            }}>
            <b>Вставить списком</b>
            <span className="note" style={{ margin: 0 }}>По строке на модель: «Марка; Модель; Уровень; Цель». Уровень и цель можно не писать. Существующие модели обновятся.</span>
            <textarea className="field" rows={6} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={"BMW; X5; A; 6\nToyota; Sequoia; C\nKia; Carnival"} style={{ fontFamily: "monospace", fontSize: 13 }} />
            <div><button className="btn btn-red" disabled={busy || !bulk.trim()}>Загрузить список</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
