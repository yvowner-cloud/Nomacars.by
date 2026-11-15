"use client";

import { useMemo, useState } from "react";
import { useApp } from "../Providers";
import { checkImport } from "@/lib/lot-import";
import { money } from "@/lib/format";

interface ImportRow { id: number; source: string; notes: string; collected_at: string | null; total: number; valid: number; created_at: string; who: string | null }

/** Вкладка «Импорт лотов»: вставить JSON подборки, проверить, сохранить. */
export function LotImport({ initial, readOnly }: { initial: ImportRow[]; readOnly: boolean }) {
  const { toast } = useApp();
  const [text, setText] = useState("");
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<null | { id: number; total: number; valid: number }>(null);
  const check = useMemo(() => (text.trim() ? checkImport(text) : null), [text]);

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/lot-imports", { method: "POST", headers: { "Content-Type": "text/plain; charset=utf-8" }, body: text });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setSaved(j); setText("");
      toast(`Подборка сохранена: ${j.valid} из ${j.total} лотов прошли проверку`);
      const l = await fetch("/api/admin/lot-imports").then((x) => x.json());
      setRows(l.imports || []);
    } catch (e) { toast((e as Error).message || "Не удалось сохранить"); }
    setBusy(false);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="panel">
        <div className="panel-h">Загрузить подборку лотов</div>
        <div className="box">
          <p className="note" style={{ margin: 0 }}>
            Вставьте сюда JSON подборки (формат из промта для Claude с браузером) или выберите файл. Сайт проверит каждый лот:
            обязательные поля, год, исключённые повреждения и документы, фото. Публикация на сайте — следующий шаг этапа 6.
          </p>
          {saved && <div className="hint" style={{ background: "var(--green-soft)", color: "var(--green)" }}>Сохранено: подборка №{saved.id}, принято {saved.valid} из {saved.total}. Скачать её можно в списке ниже.</div>}
          <label className="t-field">JSON подборки
            <textarea className="field mono" id="import-json" rows={10} value={text} disabled={readOnly}
              placeholder={'{\n  "source": "claude-browser-test",\n  "lots": [ … ]\n}'} onChange={(e) => { setText(e.target.value); setSaved(null); }} />
          </label>
          <div className="inline-form">
            <input type="file" accept=".json,.txt,application/json,text/plain" disabled={readOnly} aria-label="Файл подборки"
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setText(await f.text()); setSaved(null); } }} />
            {!readOnly && <button className="btn btn-red" id="import-save" disabled={busy || !check?.ok} onClick={save}>
              {busy ? "Сохраняем…" : check?.ok ? `Сохранить подборку (${check.valid} из ${check.lots.length})` : "Сохранить подборку"}</button>}
          </div>

          {check && (check.fatal && !check.lots.length ? <div className="err" role="alert">{check.fatal}</div> : (
            <>
              <div className="note">
                Лотов: <b>{check.lots.length}</b> · проходят проверку: <b style={{ color: "var(--green)" }}>{check.valid}</b> · отклонено: <b style={{ color: "var(--red)" }}>{check.lots.length - check.valid}</b>
                {check.source && <> · источник: {check.source}</>}
              </div>
              {check.notes && <div className="quote">{check.notes}</div>}
              <div className="tbl-wrap"><table>
                <thead><tr><th>#</th><th>Лот</th><th>Автомобиль</th><th>Повреждение</th><th className="r">Ставка</th><th className="r">Оценка</th><th>Фото</th><th>Проверка</th></tr></thead>
                <tbody>{check.lots.map((c) => {
                  const l = c.lot;
                  return (
                    <tr key={c.key + c.index} style={!l ? { background: "#fdecea" } : undefined}>
                      <td>{c.index + 1}</td>
                      <td className="mono">{c.key}</td>
                      <td style={{ whiteSpace: "normal" }}>{l ? `${l.year} ${l.make} ${l.model} ${l.trim}` : "—"}</td>
                      <td style={{ whiteSpace: "normal" }}>{l ? `${l.primary_damage}${l.secondary_damage ? ", " + l.secondary_damage : ""}` : "—"}</td>
                      <td className="r num">{l?.current_bid_usd ? money(l.current_bid_usd) : "—"}</td>
                      <td className="r">{l?.score ?? "—"}</td>
                      <td>{l?.photos.length ?? 0}</td>
                      <td style={{ whiteSpace: "normal", minWidth: 220, fontSize: 12.5 }}>
                        {c.errors.map((e) => <div key={e} style={{ color: "var(--red)" }}>✗ {e}</div>)}
                        {c.warnings.map((w) => <div key={w} style={{ color: "var(--warn)" }}>! {w}</div>)}
                        {!c.errors.length && !c.warnings.length && <span style={{ color: "var(--green)" }}>✓ всё в порядке</span>}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            </>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">Загруженные подборки</div>
        <div className="box">
          {rows.length === 0 ? <p className="note" style={{ margin: 0 }}>Пока ничего не загружено.</p> : (
            <div className="tbl-wrap"><table>
              <thead><tr><th>№</th><th>Когда</th><th>Источник</th><th className="r">Принято</th><th>Кто</th><th></th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td className="num">{new Date(r.created_at).toLocaleString("ru-RU")}</td>
                  <td>{r.source}</td>
                  <td className="r">{r.valid} из {r.total}</td>
                  <td>{r.who || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}><a className="lock-cta" href={`/api/admin/lot-imports/${r.id}`}>Скачать JSON</a>{" · "}<a className="lock-cta" href={`/api/admin/lot-imports/${r.id}?raw`}>Исходник</a></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  );
}
