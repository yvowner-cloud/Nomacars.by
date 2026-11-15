"use client";

import { useRef, useState } from "react";
import { useApp } from "../Providers";
import { money } from "@/lib/format";

export interface Inv { id: number; title: string; amount: number; paid_at: string | null; created_at: string }
export interface Doc { id: number; name: string; mime: string; size: number; stage: string | null; created_at: string }

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(n / 1024))} КБ`);
const d = (s: string) => new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });

/** Счета и документы заявки (кабинет владельца). onData — обновить данные заявки после действия. */
export function LeadBilling({ leadId, invoices, docs, hasCalc, onData }: {
  leadId: number; invoices: Inv[]; docs: Doc[]; hasCalc: boolean; onData: (j: { invoices: Inv[]; docs: Doc[] }) => void;
}) {
  const { toast } = useApp();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [docName, setDocName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const call = async (url: string, init: RequestInit, ok: string) => {
    setBusy(true);
    try {
      const r = await fetch(url, init);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Не получилось");
      toast(ok);
      if (j.invoices) onData(j);
      else { const g = await fetch(`/api/admin/leads/${leadId}`).then((x) => x.json()); onData(g); }
      return true;
    } catch (e) { toast((e as Error).message); return false; }
    finally { setBusy(false); }
  };
  const json = (method: string, data?: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: data ? JSON.stringify(data) : undefined });

  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const paid = invoices.filter((i) => i.paid_at).reduce((s, i) => s + i.amount, 0);

  return (
    <div className="billing-wrap">
      <div className="billing">
        <b>Счета</b>
        {invoices.length === 0 ? <p className="note" style={{ margin: 0 }}>Счетов пока нет. Обычно их выставляют после выигрыша торгов.</p> : (
          <>
            <div className="tbl-wrap"><table>
              <tbody>{invoices.map((i) => (
                <tr key={i.id}>
                  <td style={{ whiteSpace: "normal" }}>{i.title}<div className="note">от {d(i.created_at)}</div></td>
                  <td className="r num"><b>{money(i.amount)}</b></td>
                  <td>{i.paid_at ? <span className="pill pill-ok">Оплачен {d(i.paid_at)}</span> : <span className="pill pill-wait">Ждёт оплаты</span>}</td>
                  <td className="r inv-actions">
                    <a className="lock-cta" href={`/cabinet/invoice/${i.id}`} target="_blank" rel="noreferrer">Счёт</a>{" · "}
                    <button className="lock-cta" disabled={busy} onClick={() => call(`/api/admin/invoices/${i.id}`, json("PATCH", { paid: !i.paid_at }), i.paid_at ? "Отметка оплаты снята" : "Оплата отмечена — клиент увидит это в кабинете")}>
                      {i.paid_at ? "Снять оплату" : "Отметить оплату"}</button>
                    {!i.paid_at && <>{" · "}<button className="lock-cta" disabled={busy} onClick={() => call(`/api/admin/invoices/${i.id}`, json("DELETE"), "Счёт удалён")}>Удалить</button></>}
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
            <div className="note">Всего {money(total)} · оплачено {money(paid)} · осталось <b>{money(total - paid)}</b></div>
          </>
        )}
        <form className="inline-form" onSubmit={async (e) => {
          e.preventDefault();
          if (await call(`/api/admin/leads/${leadId}/invoices`, json("POST", { title, amount }), "Счёт выставлен — клиент увидит его в кабинете")) { setTitle(""); setAmount(""); }
        }}>
          <input className="field" placeholder="Назначение счёта" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Назначение счёта" />
          <input className="field num" placeholder="Сумма, $" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Сумма, $" style={{ maxWidth: 120 }} />
          <button className="btn btn-dark btn-sm" disabled={busy || !title || !amount}>Выставить</button>
        </form>
        {hasCalc && invoices.length === 0 && (
          <button className="btn btn-line btn-sm" style={{ justifySelf: "start" }} disabled={busy}
            onClick={() => call(`/api/admin/leads/${leadId}/invoices`, json("POST", { fromCalc: true }), "Созданы счета по расчёту")}>
            Создать 4 счёта из расчёта
          </button>
        )}
      </div>

      <div className="billing">
        <b>Документы</b>
        {docs.length === 0 ? <p className="note" style={{ margin: 0 }}>Документов пока нет. Договор, инвойс аукциона, коносамент, фото из порта — загружайте по этапам.</p> : (
          <ul className="doclist">{docs.map((x) => (
            <li key={x.id}>
              <a href={`/api/files/${x.id}?view`} target="_blank" rel="noreferrer">{x.name}</a>
              <span className="note"> · {x.stage || "—"} · {kb(x.size)} · {d(x.created_at)}</span>
              {" "}<button className="lock-cta" disabled={busy} onClick={() => call(`/api/admin/documents/${x.id}`, json("DELETE"), "Документ удалён")}>Удалить</button>
            </li>
          ))}</ul>
        )}
        <form className="inline-form" onSubmit={async (e) => {
          e.preventDefault();
          const f = fileRef.current?.files?.[0];
          if (!f) { toast("Выберите файл"); return; }
          if (f.size > 20 * 1024 * 1024) { toast("Файл больше 20 МБ"); return; }
          const fd = new FormData(); fd.append("file", f); fd.append("name", docName);
          if (await call(`/api/admin/leads/${leadId}/documents`, { method: "POST", body: fd }, "Документ загружен — клиент увидит его в кабинете")) {
            setDocName(""); if (fileRef.current) fileRef.current.value = "";
          }
        }}>
          <input className="field" placeholder="Название (например, «Коносамент»)" value={docName} onChange={(e) => setDocName(e.target.value)} aria-label="Название документа" />
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.docx,.xlsx" aria-label="Файл" style={{ maxWidth: 220 }} />
          <button className="btn btn-dark btn-sm" disabled={busy}>Загрузить</button>
        </form>
        <span className="note">PDF, фото, Word, Excel — до 20 МБ.</span>
      </div>
    </div>
  );
}
