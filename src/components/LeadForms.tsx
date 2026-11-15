"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "./Providers";
import { money } from "@/lib/format";
import type { CalcInput } from "@/lib/types";

async function sendLead(data: Record<string, unknown>): Promise<{ id: number; existing: boolean }> {
  const r = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Не удалось отправить заявку. Попробуйте ещё раз.");
  return j;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="panel-h">{title}<button className="modal-x" onClick={onClose} aria-label="Закрыть">×</button></div>
        {children}
      </div>
    </div>
  );
}

function Done({ existing, onClose }: { existing: boolean; onClose: () => void }) {
  return (
    <div className="box">
      <b style={{ fontSize: 16 }}>{existing ? "Заявка на этот лот у вас уже есть" : "Заявка принята"}</b>
      <p style={{ margin: 0 }}>
        {existing ? "Менеджер уже работает с ней и свяжется с вами." : "Менеджер свяжется с вами в течение 30 минут в рабочее время (Пн–Пт 9:00–19:00, Сб 10:00–16:00)."}
      </p>
      <button className="btn btn-red" onClick={onClose}>Хорошо</button>
    </div>
  );
}

/** «Хочу эту машину» на карточке лота. */
export function WantButton({ lotId, title, bid }: { lotId: number; title: string; bid: number }) {
  const { user, openLogin, country } = useApp();
  const [open, setOpen] = useState(false);
  const [maxBid, setMaxBid] = useState(String(Math.round((bid + 1500) / 100) * 100));
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<null | { existing: boolean }>(null);
  const close = () => { setOpen(false); setDone(null); setErr(""); };

  return (
    <>
      <button className="btn btn-red btn-block" onClick={() => (user ? setOpen(true) : openLogin(() => setOpen(true)))}>Хочу эту машину</button>
      {open && (
        <Modal title="Заявка на лот" onClose={close}>
          {done ? <Done existing={done.existing} onClose={close} /> : (
            <form className="box" onSubmit={async (e) => {
              e.preventDefault(); setBusy(true); setErr("");
              try { setDone(await sendLead({ kind: "lot", lotId, maxBid, comment, country })); }
              catch (ex) { setErr((ex as Error).message); }
              setBusy(false);
            }}>
              <b>{title}</b>
              <p className="muted" style={{ margin: 0 }}>Менеджер проверит лот, историю и повреждения, затем согласует с вами ставку. Предоплата не нужна.</p>
              <label>Максимальная ставка на торгах, $ <span className="muted">(текущая {money(bid)})</span>
                <input className="field num" id="w-bid" inputMode="numeric" value={maxBid} onChange={(e) => setMaxBid(e.target.value)} /></label>
              <label>Комментарий <span className="muted">(необязательно)</span>
                <textarea className="field" id="w-com" rows={3} maxLength={1000} placeholder="Например: нужен отчёт Carfax, интересует цвет салона" value={comment} onChange={(e) => setComment(e.target.value)} /></label>
              {err && <div className="err" role="alert">{err}</div>}
              <button className="btn btn-red" type="submit" disabled={busy}>{busy ? "Отправляем…" : "Отправить заявку"}</button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}

/** «Подобрать автомобиль»: бюджет и пожелания. */
export function PickButton({ className = "btn btn-red", label = "Подобрать автомобиль" }: { className?: string; label?: string }) {
  const { user, openLogin, country } = useApp();
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState("25000");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<null | { existing: boolean }>(null);
  const close = () => { setOpen(false); setDone(null); setErr(""); };

  return (
    <>
      <button className={className} onClick={() => (user ? setOpen(true) : openLogin(() => setOpen(true)))}>{label}</button>
      {open && (
        <Modal title="Подбор автомобиля" onClose={close}>
          {done ? <Done existing={false} onClose={close} /> : (
            <form className="box" onSubmit={async (e) => {
              e.preventDefault();
              if (comment.trim().length < 5) { setErr("Опишите, какую машину ищете: марка, кузов, год, пожелания"); return; }
              setBusy(true); setErr("");
              try { setDone(await sendLead({ kind: "pick", budget, comment, country })); }
              catch (ex) { setErr((ex as Error).message); }
              setBusy(false);
            }}>
              <p className="muted" style={{ margin: 0 }}>Не нашли подходящую машину в каталоге? Опишите, что ищете, и менеджер подберёт лоты под ваш бюджет.</p>
              <label>Бюджет под ключ, $<input className="field num" id="p-budget" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
              <label>Что ищете<textarea className="field" id="p-wish" rows={3} maxLength={1000} placeholder="Например: кроссовер, бензин, 2022–2023, без серьёзных повреждений" value={comment} onChange={(e) => setComment(e.target.value)} /></label>
              {err && <div className="err" role="alert">{err}</div>}
              <button className="btn btn-red" type="submit" disabled={busy}>{busy ? "Отправляем…" : "Отправить запрос"}</button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}

/** «Получить точный расчёт» в калькуляторе. */
export function ExactCalcButton({ input }: { input: Partial<CalcInput> }) {
  const { country, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <button className="btn btn-red" disabled={busy || sent} onClick={async () => {
      setBusy(true);
      try { await sendLead({ kind: "calc", calcInput: input, country }); setSent(true); toast("Запрос отправлен. Менеджер пришлёт точный расчёт"); }
      catch (e) { toast((e as Error).message); }
      setBusy(false);
    }}>{sent ? "Запрос отправлен" : busy ? "Отправляем…" : "Получить точный расчёт"}</button>
  );
}
