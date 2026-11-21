"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "./Providers";
import { money } from "@/lib/format";
import type { CalcInput } from "@/lib/types";
import { COMPANY } from "@/lib/company";

/** Имя и телефон гостя — при открытом доступе, когда клиент не вошёл. */
function useGuest() {
  const { user } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+375 ");
  const fields = user ? null : (
    <>
      <label>Как к вам обращаться<input className="field" id="g-name" autoComplete="name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} required /></label>
      <label>Телефон для связи<input className="field num" id="g-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
    </>
  );
  return { fields, data: user ? {} : { name, phone } };
}

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
        {existing ? "Менеджер уже работает с ней и свяжется с вами." : `Менеджер свяжется с вами в течение 30 минут в рабочее время (${COMPANY.hours.toLowerCase()}).`}
      </p>
      <button className="btn btn-red" onClick={onClose}>Хорошо</button>
    </div>
  );
}

/** «Хочу эту машину» на карточке лота. */
export function WantButton({ lotId, title, bid }: { lotId: number; title: string; bid: number }) {
  const { user, openLogin, country, open: openAccess } = useApp();
  const guest = useGuest();
  const [open, setOpen] = useState(false);
  const [maxBid, setMaxBid] = useState(String(Math.round((bid + 1500) / 100) * 100));
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<null | { existing: boolean }>(null);
  const close = () => { setOpen(false); setDone(null); setErr(""); };

  return (
    <>
      <button className="btn btn-red btn-block" onClick={() => (user || openAccess ? setOpen(true) : openLogin(() => setOpen(true)))}>Хочу эту машину</button>
      {open && (
        <Modal title="Заявка на лот" onClose={close}>
          {done ? <Done existing={done.existing} onClose={close} /> : (
            <form className="box" onSubmit={async (e) => {
              e.preventDefault(); setBusy(true); setErr("");
              try { setDone(await sendLead({ kind: "lot", lotId, maxBid, comment, country, ...guest.data })); }
              catch (ex) { setErr((ex as Error).message); }
              setBusy(false);
            }}>
              <b>{title}</b>
              {guest.fields}
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
  const { user, openLogin, country, open: openAccess } = useApp();
  const guest = useGuest();
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState("25000");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<null | { existing: boolean }>(null);
  const close = () => { setOpen(false); setDone(null); setErr(""); };

  return (
    <>
      <button className={className} onClick={() => (user || openAccess ? setOpen(true) : openLogin(() => setOpen(true)))}>{label}</button>
      {open && (
        <Modal title="Подбор автомобиля" onClose={close}>
          {done ? <Done existing={false} onClose={close} /> : (
            <form className="box" onSubmit={async (e) => {
              e.preventDefault();
              if (comment.trim().length < 5) { setErr("Опишите, какую машину ищете: марка, кузов, год, пожелания"); return; }
              setBusy(true); setErr("");
              try { setDone(await sendLead({ kind: "pick", budget, comment, country, ...guest.data })); }
              catch (ex) { setErr((ex as Error).message); }
              setBusy(false);
            }}>
              <p className="muted" style={{ margin: 0 }}>Не нашли подходящую машину в каталоге? Опишите, что ищете, и менеджер подберёт лоты под ваш бюджет.</p>
              {guest.fields}
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

/** «Получить точный расчёт» в калькуляторе. Гость (открытый доступ) оставляет имя и телефон в окне. */
export function ExactCalcButton({ input }: { input: Partial<CalcInput> }) {
  const { country, toast, user } = useApp();
  const guest = useGuest();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState("");
  const send = async () => {
    setBusy(true); setErr("");
    try { await sendLead({ kind: "calc", calcInput: input, country, ...guest.data }); setSent(true); setAsk(false); toast("Запрос отправлен. Менеджер пришлёт точный расчёт"); }
    catch (e) { if (ask) setErr((e as Error).message); else toast((e as Error).message); }
    setBusy(false);
  };
  return (
    <>
      <button className="btn btn-red" disabled={busy || sent} onClick={() => (user ? send() : setAsk(true))}>
        {sent ? "Запрос отправлен" : busy ? "Отправляем…" : "Получить точный расчёт"}
      </button>
      {ask && (
        <Modal title="Точный расчёт" onClose={() => setAsk(false)}>
          <form className="box" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <p className="muted" style={{ margin: 0 }}>Менеджер проверит расчёт по актуальным ставкам и пришлёт точную сумму.</p>
            {guest.fields}
            {err && <div className="err" role="alert">{err}</div>}
            <button className="btn btn-red" type="submit" disabled={busy}>{busy ? "Отправляем…" : "Отправить запрос"}</button>
          </form>
        </Modal>
      )}
    </>
  );
}
