"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../Providers";
import { money } from "@/lib/format";

export interface AdminLot {
  id: number; slug: string; auction: string; lotNumber: string; title: string; photo: string | null; score: number;
  saleAt: string | null; status: string; dbStatus: string; soldPrice: number | null; visible: boolean; bid: number | null;
  url: string | null; damage: string; state: string | null;
}

const STATUS: Record<string, string> = { active: "Идут торги", sold: "Продан", ended: "Торги завершены", removed: "Снят с аукциона" };

/** Вкладка «Лоты и подборка»: что сейчас на сайте, тумблеры, итоги торгов. */
export function LotsAdmin({ initial, readOnly }: { initial: AdminLot[]; readOnly: boolean }) {
  const router = useRouter();
  const { toast } = useApp();
  const [lots, setLots] = useState(initial);
  const [filter, setFilter] = useState<"all" | "active" | "past" | "hidden">("active");
  const [q, setQ] = useState("");
  const [prices, setPrices] = useState<Record<number, string>>({});

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return lots.filter((l) =>
      (filter === "all" || (filter === "active" && l.status === "active" && l.visible) || (filter === "past" && l.status !== "active") || (filter === "hidden" && !l.visible)) &&
      (!t || `${l.title} ${l.lotNumber} ${l.auction}`.toLowerCase().includes(t)));
  }, [lots, filter, q]);

  const patch = async (id: number, data: Record<string, unknown>, ok: string) => {
    const r = await fetch(`/api/admin/lots/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { toast(j.error || "Не удалось сохранить"); return; }
    if (j.lot) setLots((ls) => ls.map((l) => (l.id === id ? j.lot : l)));
    toast(ok); router.refresh();
  };

  const counts = {
    active: lots.filter((l) => l.status === "active" && l.visible).length,
    past: lots.filter((l) => l.status !== "active").length,
    hidden: lots.filter((l) => !l.visible).length,
    all: lots.length,
  };

  if (!lots.length) {
    return (
      <div className="panel empty">
        <b>Реальных лотов пока нет — на сайте показываются демо-машины</b>
        <span>Загрузите подборку во вкладке «Импорт лотов» — лоты сразу появятся на сайте, а демо-машины исчезнут.</span>
        <Link className="btn btn-red" href="/admin?tab=import">Импорт лотов</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="lead-filters">
        <div className="chips" role="group" aria-label="Фильтр">
          {([["active", "На сайте, торги впереди"], ["past", "Торги прошли"], ["hidden", "Скрытые"], ["all", "Все"]] as const).map(([k, label]) => (
            <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label} <em>{counts[k]}</em></button>
          ))}
        </div>
        <input className="field" placeholder="Поиск: модель, номер лота" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} aria-label="Поиск лотов" />
      </div>
      <p className="note" style={{ margin: 0 }}>
        «Топ недели» — 12 лотов с наибольшей оценкой. Лот с прошедшей датой торгов автоматически становится «Торги завершены»;
        впишите цену выкупа — он станет «Продан за $X». Тумблер снимает лот с сайта мгновенно.
      </p>
      <div className="tbl-wrap"><table>
        <thead><tr><th>На сайте</th><th>Фото</th><th>Лот</th><th className="r">Оценка</th><th>Торги</th><th className="r">Ставка</th><th>Итог торгов</th></tr></thead>
        <tbody>{list.map((l) => (
          <tr key={l.id} style={!l.visible ? { opacity: 0.55 } : undefined}>
            <td><label className="sw"><input type="checkbox" checked={l.visible} disabled={readOnly} aria-label="Показывать на сайте"
              onChange={(e) => patch(l.id, { visible: e.target.checked }, e.target.checked ? "Лот снова на сайте" : "Лот снят с сайта")} /><i /></label></td>
            <td>{l.photo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={l.photo} alt="" referrerPolicy="no-referrer" loading="lazy" style={{ width: 84, aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
              : <span className="note">нет фото</span>}</td>
            <td style={{ whiteSpace: "normal", minWidth: 200 }}>
              <Link href={`/lot/${l.slug}`} target="_blank"><b>{l.title}</b></Link>
              <div className="note mono">{l.auction} · {l.lotNumber}{l.state ? ` · ${l.state}` : ""}</div>
              <div className="note">{l.damage}{l.url && <> · <a href={l.url} target="_blank" rel="noreferrer">на аукционе ↗</a></>}</div>
            </td>
            <td className="r"><b>{l.score}</b></td>
            <td className="num">{l.saleAt ? new Date(l.saleAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}<div className="note">{STATUS[l.status] ?? l.status}</div></td>
            <td className="r num">{l.bid ? money(l.bid) : "—"}</td>
            <td style={{ minWidth: 230 }}>
              {readOnly ? (l.soldPrice ? money(l.soldPrice) : "—") : (
                <form className="inline-form" onSubmit={(e) => { e.preventDefault(); patch(l.id, { soldPrice: prices[l.id] ?? "" }, "Цена выкупа сохранена — лот помечен «Продан»"); }}>
                  <input className="field num" style={{ maxWidth: 110 }} inputMode="numeric" placeholder="Продан за, $" aria-label="Цена выкупа"
                    value={prices[l.id] ?? (l.soldPrice ? String(l.soldPrice) : "")} onChange={(e) => setPrices((p) => ({ ...p, [l.id]: e.target.value }))} />
                  <button className="btn btn-dark btn-sm">OK</button>
                  {l.dbStatus !== "removed"
                    ? <button type="button" className="lock-cta" onClick={() => patch(l.id, { status: "removed" }, "Лот помечен «Снят с аукциона»")}>Снят</button>
                    : <button type="button" className="lock-cta" onClick={() => patch(l.id, { status: "active" }, "Лот возвращён")}>Вернуть</button>}
                </form>
              )}
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
