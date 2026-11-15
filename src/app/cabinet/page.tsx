import type { Metadata } from "next";
import Link from "next/link";
import { currentUser, favoriteIds } from "@/lib/server/auth";
import { myLeads } from "@/lib/server/leads";
import { docsOf, invoicesOf, markSeen } from "@/lib/server/billing";
import { q1 } from "@/lib/server/db";
import { getTariffs } from "@/lib/server/settings";
import { toPublicAll } from "@/lib/server/public-lots";
import { LOTS } from "@/lib/lots";
import { LEAD_STATUSES } from "@/lib/lead-status";
import { TRACK, trackStep } from "@/lib/track";
import { money } from "@/lib/format";
import { LoginGate } from "@/components/admin/LoginGate";
import { LotCard } from "@/components/LotCard";
import { CarArt } from "@/components/CarArt";
import { ProfileForm } from "@/components/ProfileForm";
import { PickButton } from "@/components/LeadForms";

export const metadata: Metadata = { title: "Личный кабинет", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TABS = [["cars", "Мои машины"], ["invoices", "Счета"], ["docs", "Документы"], ["fav", "Избранное"], ["profile", "Профиль"]] as const;
const dd = (s: string | Date) => new Date(s).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(n / 1024))} КБ`);

export default async function CabinetPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? "cars") as (typeof TABS)[number][0];
  const user = await currentUser();
  if (!user) {
    return <section className="sec"><div className="wrap"><LoginGate text="Войдите по номеру телефона, чтобы видеть свои заявки, счета и документы." /></div></section>;
  }

  const leads = await myLeads(user.id);
  const ids = leads.map((l) => l.id);
  const [invoices, docs, seenRow] = await Promise.all([
    invoicesOf(ids), docsOf(ids),
    q1<{ seen_at: string }>("select seen_at from client_seen where user_id=$1", [user.id]),
  ]);
  const seen = seenRow ? new Date(seenRow.seen_at) : new Date(0);
  const isNew = (s: string) => new Date(s) > seen;
  await markSeen(user.id);

  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const paid = invoices.filter((i) => i.paid_at).reduce((s, i) => s + i.amount, 0);
  const lotOf = (id: number | null) => (id ? LOTS.find((l) => l.id === id) : undefined);
  const leadTitle = (leadId: number) => {
    const l = leads.find((x) => x.id === leadId);
    const lot = lotOf(l?.lot_id ?? null);
    return lot ? `${lot.year} ${lot.make} ${lot.model}` : l?.kind === "pick" ? "Подбор автомобиля" : "Расчёт";
  };
  const counts = { cars: leads.length, invoices: invoices.filter((i) => !i.paid_at).length, docs: docs.length, fav: 0, profile: 0 };

  let body: React.ReactNode = null;
  if (tab === "cars") {
    body = leads.length === 0 ? (
      <div className="panel empty">
        <b>Заявок пока нет</b>
        <span>Выберите машину в каталоге и нажмите «Хочу эту машину» — или попросите менеджера подобрать вариант под ваш бюджет.</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}><Link className="btn btn-red" href="/catalog">Открыть каталог</Link><PickButton className="btn btn-line" /></div>
      </div>
    ) : (
      <div style={{ display: "grid", gap: 12 }}>
        {leads.map((l) => {
          const lot = lotOf(l.lot_id);
          const step = trackStep(l.status);
          const closed = l.status === "rejected";
          const st = LEAD_STATUSES.find((s) => s.key === l.status);
          const myInv = invoices.filter((i) => i.lead_id === l.id);
          const myDocs = docs.filter((d) => d.lead_id === l.id);
          const fresh = isNew(l.updated_at) && l.updated_at !== l.created_at;
          return (
            <div key={l.id} className={`panel car-card${fresh ? " is-fresh" : ""}`}>
              <div className="car-head">
                {lot && <Link href={`/lot/${lot.slug}`} className="car-thumb"><CarArt lot={lot} /></Link>}
                <div style={{ minWidth: 0 }}>
                  <div className="ctitle" style={{ fontSize: 16 }}>{lot ? `${lot.year} ${lot.make} ${lot.model} ${lot.trim}` : l.kind === "pick" ? "Подбор автомобиля" : "Точный расчёт"}</div>
                  <div className="note">Заявка №{l.id} от {dd(l.created_at)}{lot ? ` · ${lot.auction} ${lot.lotNo}` : ""}{l.max_bid ? ` · ставка до ${money(l.max_bid)}` : ""}{l.budget ? ` · бюджет ${money(l.budget)}` : ""}</div>
                </div>
                <span className={`pill ${closed ? "pill-off" : l.status === "delivered" ? "pill-ok" : "pill-wait"}`}>{fresh && "● "}{st?.client ?? l.status}</span>
              </div>
              {closed ? (
                <p className="note" style={{ margin: 0 }}>Заявка закрыта. Если хотите, менеджер подберёт похожий вариант.</p>
              ) : (
                <>
                  <div className="track" role="img" aria-label={`Этап ${step + 1} из ${TRACK.length}: ${TRACK[step]}`}>
                    {TRACK.map((t, i) => <div key={t} className={i < step ? "done" : i === step ? "cur" : ""} title={t} />)}
                  </div>
                  <div className="track-l"><span>Сейчас: <b>{TRACK[step]}</b></span><span>{step < TRACK.length - 1 ? `Дальше: ${TRACK[step + 1]}` : "Автомобиль выдан"}</span></div>
                </>
              )}
              {(myInv.length > 0 || myDocs.length > 0) && (
                <div className="note">
                  {myInv.length > 0 && <Link href="/cabinet?tab=invoices">Счета: {myInv.filter((i) => !i.paid_at).length} к оплате из {myInv.length}</Link>}
                  {myInv.length > 0 && myDocs.length > 0 && " · "}
                  {myDocs.length > 0 && <Link href="/cabinet?tab=docs">Документы: {myDocs.length}</Link>}
                </div>
              )}
              {l.comment && <div className="note">Ваш комментарий: {l.comment}</div>}
            </div>
          );
        })}
      </div>
    );
  } else if (tab === "invoices") {
    body = invoices.length === 0 ? (
      <div className="panel empty"><b>Счетов пока нет</b><span>Счёт за лот выставляется после выигрыша торгов. Предоплата не нужна.</span></div>
    ) : (
      <div style={{ display: "grid", gap: 12 }}>
        <div className="sum-tiles">
          <div className="panel"><span>Всего по счетам</span><b className="num">{money(total)}</b></div>
          <div className="panel"><span>Оплачено</span><b className="num" style={{ color: "var(--green)" }}>{money(paid)}</b></div>
          <div className="panel"><span>Осталось оплатить</span><b className="num">{money(total - paid)}</b></div>
        </div>
        <div className="tbl-wrap"><table>
          <thead><tr><th>Счёт</th><th>Автомобиль</th><th className="r">Сумма</th><th>Статус</th><th></th></tr></thead>
          <tbody>{invoices.map((i) => (
            <tr key={i.id}>
              <td style={{ whiteSpace: "normal" }}>{isNew(i.created_at) && <b style={{ color: "var(--red)" }}>Новый · </b>}{i.title}<div className="note">от {dd(i.created_at)}</div></td>
              <td>{leadTitle(i.lead_id)}</td>
              <td className="r num"><b>{money(i.amount)}</b></td>
              <td>{i.paid_at ? <span className="pill pill-ok">Оплачен</span> : <span className="pill pill-wait">Ожидает оплаты</span>}</td>
              <td><Link className="btn btn-line btn-sm" href={`/cabinet/invoice/${i.id}`}>Открыть счёт</Link></td>
            </tr>
          ))}</tbody>
        </table></div>
        <p className="note" style={{ margin: 0 }}>Оплата переводом по реквизитам из счёта. Статус «Оплачен» менеджер отмечает после поступления денег.</p>
      </div>
    );
  } else if (tab === "docs") {
    body = docs.length === 0 ? (
      <div className="panel empty"><b>Документов пока нет</b><span>Договор, инвойс аукциона, коносамент и фото появятся здесь по мере прохождения этапов.</span></div>
    ) : (
      <div className="tbl-wrap"><table>
        <thead><tr><th>Документ</th><th>Этап</th><th>Автомобиль</th><th>Размер</th><th></th></tr></thead>
        <tbody>{docs.map((d) => (
          <tr key={d.id}>
            <td style={{ whiteSpace: "normal" }}>{isNew(d.created_at) && <b style={{ color: "var(--red)" }}>Новый · </b>}{d.name}<div className="note">{dd(d.created_at)}</div></td>
            <td>{d.stage || "—"}</td>
            <td>{leadTitle(d.lead_id)}</td>
            <td className="num">{kb(d.size)}</td>
            <td style={{ whiteSpace: "nowrap" }}>
              {(d.mime.startsWith("image/") || d.mime === "application/pdf") && <><a className="lock-cta" href={`/api/files/${d.id}?view`} target="_blank" rel="noreferrer">Открыть</a>{" · "}</>}
              <a className="lock-cta" href={`/api/files/${d.id}`}>Скачать</a>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    );
  } else if (tab === "fav") {
    const favIds = await favoriteIds(user.id);
    const favLots = toPublicAll(LOTS.filter((l) => favIds.includes(l.id)), user, await getTariffs());
    body = favLots.length === 0
      ? <div className="panel empty"><b>В избранном пусто</b><span>Нажмите ☆ на карточке лота, чтобы следить за ним.</span><Link className="btn btn-red" href="/catalog">Открыть каталог</Link></div>
      : <div className="grid">{favLots.map((l) => <LotCard key={l.id} lot={l} />)}</div>;
  } else {
    body = <ProfileForm name={user.name} phone={user.phone} country={user.country} />;
  }

  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-h">
          <div><div className="eyebrow">Личный кабинет</div><h1 style={{ fontSize: "clamp(24px,3.4vw,34px)" }}>{user.name || "Мои заявки"}</h1></div>
          <span className="note num">{user.phone}</span>
        </div>
        <nav className="tabs" aria-label="Разделы кабинета" style={{ marginBottom: 16 }}>
          {TABS.map(([k, label]) => (
            <Link key={k} href={`/cabinet?tab=${k}`} className="tab-link" aria-current={k === tab ? "page" : undefined}>
              {label}{counts[k] > 0 && k !== "cars" && <span className="tab-badge">{counts[k]}</span>}
            </Link>
          ))}
        </nav>
        {body}
      </div>
    </section>
  );
}
