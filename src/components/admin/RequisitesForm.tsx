"use client";

import { useState } from "react";
import { useApp } from "../Providers";
import type { Requisites } from "@/lib/server/billing";

const FIELDS: { key: keyof Requisites; label: string; ph: string; wide?: boolean }[] = [
  { key: "legalName", label: "Получатель (ИП или организация)", ph: "ИП Иванов Иван Иванович / ООО «Номакарс»", wide: true },
  { key: "unp", label: "УНП", ph: "190000000" },
  { key: "address", label: "Юридический адрес", ph: "220000, г. Минск, ул. …", wide: true },
  { key: "bank", label: "Банк", ph: "ОАО «Банк», г. Минск" },
  { key: "bic", label: "БИК (BIC)", ph: "XXXXBY2X" },
  { key: "account", label: "Расчётный счёт (IBAN)", ph: "BY00 XXXX 0000 0000 0000 0000 0000", wide: true },
  { key: "phone", label: "Телефон в счёте", ph: "+375 29 …" },
  { key: "email", label: "E-mail в счёте", ph: "info@nomacars.by" },
  { key: "note", label: "Примечание в счёте", ph: "Оплата в BYN по курсу НБРБ на день оплаты. В назначении платежа укажите номер счёта.", wide: true },
];

export function RequisitesForm({ initial, readOnly }: { initial: Requisites; readOnly: boolean }) {
  const { toast } = useApp();
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);

  return (
    <div className="panel">
      <div className="panel-h">Реквизиты для счетов</div>
      <form className="box" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        try {
          const r = await fetch("/api/admin/requisites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error);
          setV(j.requisites); setSaved(j.requisites); toast("Реквизиты сохранены — они появятся во всех счетах");
        } catch (ex) { toast((ex as Error).message || "Не удалось сохранить"); }
        setBusy(false);
      }}>
        <p className="note" style={{ margin: 0 }}>Эти данные печатаются в счетах, которые клиенты открывают в личном кабинете. Пока они не заполнены, в счёте будет пометка «реквизиты уточняйте у менеджера».</p>
        <div className="t-grid">
          {FIELDS.map((f) => (
            <label className="t-field" key={f.key} style={f.wide ? { gridColumn: "1 / -1" } : undefined}>
              {f.label}
              {f.key === "note"
                ? <textarea className="field" rows={2} placeholder={f.ph} value={v[f.key]} disabled={readOnly} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
                : <input className="field" placeholder={f.ph} value={v[f.key]} disabled={readOnly} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}
            </label>
          ))}
        </div>
        {!readOnly && <button className="btn btn-red" style={{ justifySelf: "start" }} disabled={busy || !dirty}>{busy ? "Сохраняем…" : "Сохранить реквизиты"}</button>}
      </form>
    </div>
  );
}
