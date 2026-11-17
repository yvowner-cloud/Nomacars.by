import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/server/auth";
import { AuthError } from "@/lib/server/auth";
import { getRequisites, invoiceWithLead } from "@/lib/server/billing";
import { getTariffs } from "@/lib/server/settings";
import { lotById } from "@/lib/server/catalog";
import { fmt, money } from "@/lib/format";
import { LoginGate } from "@/components/admin/LoginGate";
import { PrintButton } from "@/components/PrintButton";

export const metadata: Metadata = { title: "Счёт", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return <section className="sec"><div className="wrap"><LoginGate text="Войдите, чтобы открыть счёт." /></div></section>;

  let data: Awaited<ReturnType<typeof invoiceWithLead>>;
  try { data = await invoiceWithLead(user, Number((await params).id)); }
  catch (e) {
    const msg = e instanceof AuthError ? e.message : "Счёт недоступен";
    return <section className="sec"><div className="wrap"><div className="panel empty"><b>{msg}</b><Link className="btn btn-red" href="/cabinet?tab=invoices">Мои счета</Link></div></div></section>;
  }
  const { inv, lead } = data;
  const [req, T] = await Promise.all([getRequisites(), getTariffs()]);
  const lot = await lotById(lead.lot_id);
  const num = `NC-${lead.id}-${inv.id}`;
  const date = new Date(inv.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
  const filled = Boolean(req.legalName && req.account);

  return (
    <section className="sec invoice-page">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <Link href={user.role === "client" ? "/cabinet?tab=invoices" : `/admin?tab=leads&lead=${lead.id}`}>← Назад</Link>
          <PrintButton />
        </div>
        <div className="invoice">
          <div className="inv-head">
            <div><div className="logo-big" style={{ fontSize: 34 }}>NCARS<span className="logo-tld">.BY</span></div><div className="note">Авто с аукционов США под ключ</div></div>
            <div style={{ textAlign: "right" }}>
              <h1 style={{ fontSize: 26 }}>Счёт № {num}</h1>
              <div>от {date}</div>
              <div style={{ marginTop: 6 }}>{inv.paid_at ? <span className="pill pill-ok">Оплачен</span> : <span className="pill pill-wait">Ожидает оплаты</span>}</div>
            </div>
          </div>

          <div className="two inv-parties">
            <div>
              <div className="eyebrow">Получатель</div>
              {filled ? (
                <dl className="inv-dl">
                  <dt>Наименование</dt><dd>{req.legalName}</dd>
                  {req.unp && <><dt>УНП</dt><dd>{req.unp}</dd></>}
                  {req.address && <><dt>Адрес</dt><dd>{req.address}</dd></>}
                  {req.bank && <><dt>Банк</dt><dd>{req.bank}</dd></>}
                  {req.bic && <><dt>БИК</dt><dd>{req.bic}</dd></>}
                  <dt>Счёт (IBAN)</dt><dd className="mono">{req.account}</dd>
                  {(req.phone || req.email) && <><dt>Контакты</dt><dd>{[req.phone, req.email].filter(Boolean).join(", ")}</dd></>}
                </dl>
              ) : <p className="hint">Реквизиты для оплаты уточняйте у менеджера.</p>}
            </div>
            <div>
              <div className="eyebrow">Плательщик</div>
              <dl className="inv-dl">
                <dt>Клиент</dt><dd>{lead.name || "—"}</dd>
                <dt>Телефон</dt><dd className="num">{lead.phone}</dd>
                <dt>Заявка</dt><dd>№ {lead.id}</dd>
                {lot && <><dt>Автомобиль</dt><dd>{lot.year} {lot.make} {lot.model} {lot.trim}<br /><span className="mono">VIN {lot.vin} · {lot.auction} {lot.lotNo}</span></dd></>}
              </dl>
            </div>
          </div>

          <table className="inv-table">
            <thead><tr><th>№</th><th>Наименование</th><th className="r">Сумма</th></tr></thead>
            <tbody><tr><td>1</td><td>{inv.title}</td><td className="r num">{money(inv.amount)}</td></tr></tbody>
            <tfoot><tr><td></td><td className="r"><b>Итого к оплате</b></td><td className="r num"><b>{money(inv.amount)}</b></td></tr></tfoot>
          </table>
          <p className="note">Справочно по текущему курсу: ≈ {fmt(inv.amount * T.byn)} BYN · ≈ {fmt(inv.amount * T.rub)} ₽.</p>
          <p>В назначении платежа укажите: <b>«Оплата по счёту № {num}»</b>.</p>
          {req.note && <p style={{ whiteSpace: "pre-line" }}>{req.note}</p>}
        </div>
      </div>
    </section>
  );
}
