"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../Providers";

/** Переключатель «Открытый доступ»: пока SMS не работают, цены и заявки доступны без входа. */
export function AccessPanel({ initial, readOnly }: { initial: boolean; readOnly: boolean }) {
  const { toast } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(initial);
  const [busy, setBusy] = useState(false);
  const save = async (v: boolean) => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ open: v }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Не удалось сохранить");
      setOpen(j.open); toast(j.open ? "Открытый доступ включён: цены видны всем" : "Доступ закрыт: цены — только после входа по SMS");
      router.refresh();
    } catch (e) { toast((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="panel">
      <div className="panel-h">Доступ к ценам</div>
      <div className="box" style={{ gap: 10 }}>
        <label style={{ display: "flex", gap: 12, alignItems: "center", cursor: readOnly ? "default" : "pointer" }}>
          <span className="sw"><input type="checkbox" checked={open} disabled={readOnly || busy} onChange={(e) => save(e.target.checked)} aria-label="Открытый доступ" /><i /></span>
          <b>{open ? "Открытый доступ включён" : "Цены — только после входа"}</b>
        </label>
        <p className="note" style={{ margin: 0 }}>
          {open
            ? "Пока SMS не работают: цены под ключ, калькулятор и цены выкупа видны всем без входа, а заявку можно оставить, указав имя и телефон в форме. Когда SMS заработают — выключите."
            : "Цены и калькулятор видны после входа по коду из SMS. Включите, если SMS-сервис не работает, — клиенты не останутся без цен и заявок."}
        </p>
      </div>
    </div>
  );
}
