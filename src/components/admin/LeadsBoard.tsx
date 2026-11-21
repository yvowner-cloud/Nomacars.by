"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../Providers";
import { LeadBilling, type Doc, type Inv } from "./LeadBilling";
import { KIND_LABEL, LEAD_STATUSES, statusLabel } from "@/lib/lead-status";
import { money } from "@/lib/format";
import type { CalcInput, CalcResult } from "@/lib/types";

export interface LeadLotInfo { id: number; slug: string; title: string; lotNo: string; auction: string }
interface Lead {
  id: number; kind: "lot" | "pick" | "calc"; lot_id: number | null; status: string; country: "by" | "ru"; name: string; phone: string;
  max_bid: number | null; budget: number | null; comment: string; calc: { input?: CalcInput; result?: CalcResult; poti?: CalcResult } | null;
  notes: string; tg_notified: boolean; created_at: string;
}
interface Ev { id: number; type: string; from_status: string | null; to_status: string | null; text: string | null; created_at: string; who: string | null }

const dt = (s: string) => new Date(s).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const digits = (p: string) => p.replace(/\D/g, "");
const STATUS_CLASS: Record<string, string> = { new: "st-new", rejected: "st-off", delivered: "st-done" };

export function LeadsBoard({ lots, initialOpen }: { lots: Record<number, LeadLotInfo>; initialOpen: number | null }) {
  const router = useRouter();
  const { toast } = useApp();
  const [filter, setFilter] = useState("open");
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ rows: Lead[]; counts: Record<string, number> } | null>(null);
  const [openId, setOpenId] = useState<number | null>(initialOpen);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (filter !== "all") p.set("status", filter);
      if (q.trim()) p.set("q", q.trim());
      const r = await fetch(`/api/admin/leads?${p}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData(j); setErr("");
    } catch (e) { setErr((e as Error).message || "Не удалось загрузить заявки"); }
  }, [filter, q]);

  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const counts = data?.counts ?? {};
  const openCount = Object.entries(counts).filter(([k]) => k !== "delivered" && k !== "rejected").reduce((s, [, n]) => s + n, 0);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  const what = (l: Lead) => {
    if (l.kind === "lot" && l.lot_id && lots[l.lot_id]) return <Link href={`/lot/${lots[l.lot_id].slug}`} target="_blank">{lots[l.lot_id].title}</Link>;
    if (l.kind === "pick") return <span>{l.budget ? `бюджет до ${money(l.budget)}` : "без бюджета"}</span>;
    if (l.kind === "calc" && l.calc?.input) return <span>ставка {money(l.calc.input.price)}, {l.calc.input.cc} см³, {l.calc.input.hp} л.с.</span>;
    return <span>{KIND_LABEL[l.kind]}</span>;
  };

  const changeStatus = async (id: number, status: string) => {
    const r = await fetch(`/api/admin/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { toast(j.error || "Не удалось сменить статус"); return; }
    toast(`Статус: «${statusLabel(status)}»`);
    load(); router.refresh();
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="lead-filters">
        <div className="chips" role="group" aria-label="Фильтр по статусу">
          <button aria-pressed={filter === "open"} onClick={() => setFilter("open")}>Активные <em>{openCount}</em></button>
          {LEAD_STATUSES.map((s) => (
            <button key={s.key} aria-pressed={filter === s.key} onClick={() => setFilter(s.key)} className={STATUS_CLASS[s.key]}>
              {s.label} <em>{counts[s.key] ?? 0}</em>
            </button>
          ))}
          <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Все <em>{total}</em></button>
        </div>
        <input className="field" id="lead-q" placeholder="Поиск: имя, телефон, № заявки, модель, № лота" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 380 }} />
      </div>

      {err && <div className="err" role="alert">{err}</div>}
      {!data ? <p className="note">Загружаем заявки…</p> : data.rows.length === 0 ? (
        <div className="panel empty">
          <b>{total === 0 ? "Заявок пока нет" : "Под этот фильтр заявок нет"}</b>
          <span>{total === 0 ? "Когда клиент нажмёт «Хочу эту машину», закажет подбор или точный расчёт, заявка появится здесь и придёт в Telegram." : "Выберите другой статус или очистите поиск."}</span>
        </div>
      ) : (
        <div className="leads">
          {data.rows.map((l) => (
            <div key={l.id} className={`lead${l.status === "new" ? " is-new" : ""}`}>
              <div className="lead-row">
                <button className="lead-main" onClick={() => setOpenId(openId === l.id ? null : l.id)} aria-expanded={openId === l.id}>
                  <span className="lead-id">№{l.id}</span>
                  <span className="lead-who"><b>{l.name || "Без имени"}</b><span className="num">{l.phone} · {l.country === "by" ? "РБ" : "РФ"}</span></span>
                  <span className="lead-what">{KIND_LABEL[l.kind]}: {what(l)}{l.max_bid ? <span className="muted"> · до {money(l.max_bid)}</span> : null}</span>
                  <span className="lead-date note">{dt(l.created_at)}</span>
                </button>
                <select className={`field lead-status ${STATUS_CLASS[l.status] ?? ""}`} aria-label={`Статус заявки №${l.id}`} value={l.status} onChange={(e) => changeStatus(l.id, e.target.value)}>
                  {LEAD_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              {openId === l.id && <LeadDetail id={l.id} lead={l} lots={lots} onChanged={load} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeadDetail({ id, lead, lots, onChanged }: { id: number; lead: Lead; lots: Record<number, LeadLotInfo>; onChanged: () => void }) {
  const { toast } = useApp();
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [notes, setNotes] = useState(lead.notes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/leads/${id}`).then((r) => r.json()).then((j) => { setEvents(j.events || []); setNotes(j.lead?.notes ?? ""); setInvoices(j.invoices || []); setDocs(j.docs || []); }).catch(() => setEvents([]));
  }, [id, lead.status]);

  const lot = lead.lot_id ? lots[lead.lot_id] : null;
  const res = lead.calc?.result;
  const tel = digits(lead.phone);

  return (
    <div className="lead-detail">
      <div className="two">
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div className="contact-row">
            <span className="num" style={{ fontWeight: 700, fontSize: 16 }}>{lead.phone}</span>
            <a className="btn btn-line btn-sm" href={`tel:+${tel}`}>Позвонить</a>
            <a className="btn btn-line btn-sm" href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="btn btn-line btn-sm" href={`https://t.me/+${tel}`} target="_blank" rel="noreferrer">Telegram</a>
          </div>
          {lot && <div>Лот: <Link href={`/lot/${lot.slug}`} target="_blank">{lot.title}</Link> <span className="mono">{lot.auction} · {lot.lotNo}</span></div>}
          {lead.max_bid ? <div>Максимальная ставка клиента: <b>{money(lead.max_bid)}</b></div> : null}
          {lead.budget ? <div>Бюджет под ключ: <b>{money(lead.budget)}</b></div> : null}
          {lead.comment ? <div className="quote">«{lead.comment}»</div> : <div className="note">Комментария нет</div>}
          {res && (
            <details>
              <summary>Расчёт на момент заявки ({lead.country === "by" ? "РБ" : "РФ"}): через Клайпеду <b>{money(res.total)}</b>{lead.calc?.poti && <> · через Поти <b>{money(lead.calc.poti.total)}</b></>}</summary>
              <div style={{ marginTop: 6 }}>
                {res.lines.map((x) => <div className="cl" key={x.label}><div>{x.label}<small>{x.note}</small></div><div className="v num">{money(x.usd)}</div></div>)}
              </div>
            </details>
          )}
          <div className="note">Уведомление в Telegram: {lead.tg_notified ? "отправлено" : "не отправлялось (Telegram не подключён или ошибка)"}</div>
        </div>
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <label className="t-field">Заметки (клиент их не видит)
            <textarea className="field" rows={4} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Договорённости, ставка, что проверить…" />
          </label>
          <button className="btn btn-dark btn-sm" style={{ justifySelf: "start" }} disabled={saving || notes === lead.notes} onClick={async () => {
            setSaving(true);
            const r = await fetch(`/api/admin/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes }) });
            setSaving(false);
            if (r.ok) { toast("Заметка сохранена"); onChanged(); } else toast("Не удалось сохранить заметку");
          }}>{saving ? "Сохраняем…" : "Сохранить заметку"}</button>
          <div>
            <b style={{ fontSize: 13 }}>История</b>
            {!events ? <p className="note">Загрузка…</p> : (
              <ul className="events">
                {events.map((e) => (
                  <li key={e.id}><span className="note">{dt(e.created_at)}</span>{" "}
                    {e.type === "created" ? "Заявка создана" : e.type === "status" ? <>Статус: {statusLabel(e.from_status || "")} → <b>{statusLabel(e.to_status || "")}</b></> : e.type === "note" ? "Заметка изменена" : e.text}
                    {e.who && e.type !== "created" ? <span className="note"> · {e.who}</span> : null}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <LeadBilling leadId={id} invoices={invoices} docs={docs} hasCalc={Boolean(lead.calc?.result)}
        onData={(j) => { setInvoices(j.invoices); setDocs(j.docs); fetch(`/api/admin/leads/${id}`).then((r) => r.json()).then((g) => setEvents(g.events || [])).catch(() => {}); }} />
    </div>
  );
}
