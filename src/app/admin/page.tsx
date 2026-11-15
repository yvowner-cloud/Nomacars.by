import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/server/auth";
import { editableTariffs, effectiveRates, fxState, history } from "@/lib/server/settings";
import { newLeadsCount } from "@/lib/server/leads";
import { linkedChats, telegramConfigured } from "@/lib/server/telegram";
import { LOTS } from "@/lib/lots";
import { TariffEditor } from "@/components/admin/TariffEditor";
import { LeadsBoard, type LeadLotInfo } from "@/components/admin/LeadsBoard";
import { TelegramPanel } from "@/components/admin/TelegramPanel";
import { LoginGate } from "@/components/admin/LoginGate";
import { RequisitesForm } from "@/components/admin/RequisitesForm";
import { getRequisites } from "@/lib/server/billing";
import { LotImport } from "@/components/admin/LotImport";
import { q } from "@/lib/server/db";

export const metadata: Metadata = { title: "Кабинет владельца", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "leads", label: "Заявки", ready: true },
  { key: "tariffs", label: "Тарифы и курсы", ready: true },
  { key: "requisites", label: "Реквизиты", ready: true },
  { key: "import", label: "Импорт лотов", ready: true },
  { key: "lots", label: "Лоты и подборка", ready: false, note: "этап 6" },
  { key: "staff", label: "Сотрудники", ready: false, note: "позже" },
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tab = sp.tab === "tariffs" || sp.tab === "requisites" || sp.tab === "import" ? sp.tab : "leads";
  const user = await currentUser();
  const staff = user && (user.role === "owner" || user.role === "manager");
  const newCount = staff ? await newLeadsCount().catch(() => 0) : 0;

  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-h">
          <div><div className="eyebrow">Кабинет владельца</div><h1 style={{ fontSize: "clamp(24px,3.4vw,34px)" }}>Nomacars: управление</h1></div>
          {user && <span className="note">{user.name || user.phone} · {user.role === "owner" ? "владелец" : user.role === "manager" ? "менеджер" : "клиент"}</span>}
        </div>

        {!user ? (
          <LoginGate text="Войдите с номером владельца, чтобы управлять заявками и тарифами." />
        ) : !staff ? (
          <div className="panel empty"><b>Нет доступа</b><span>Этот раздел доступен только владельцу и менеджерам компании.</span></div>
        ) : (
          <>
            <nav className="tabs" aria-label="Разделы кабинета" style={{ marginBottom: 16 }}>
              {TABS.map((t) => t.ready ? (
                <Link key={t.key} href={`/admin?tab=${t.key}`} className="tab-link" aria-current={t.key === tab ? "page" : undefined}>
                  {t.label}{t.key === "leads" && newCount > 0 && <span className="tab-badge">{newCount}</span>}
                </Link>
              ) : (
                <span key={t.key} className="tab-link tab-off" title={`Появится: ${t.note}`}>{t.label}<small> · {t.note}</small></span>
              ))}
            </nav>

            {tab === "leads" ? (
              <div style={{ display: "grid", gap: 16 }}>
                <LeadsBoard
                  initialOpen={sp.lead ? Number(sp.lead) || null : null}
                  lots={Object.fromEntries(LOTS.map((l) => [l.id, { id: l.id, slug: l.slug, title: `${l.year} ${l.make} ${l.model} ${l.trim}`, lotNo: l.lotNo, auction: l.auction } satisfies LeadLotInfo]))}
                />
                <TelegramPanel configured={telegramConfigured()} chats={await linkedChats()} readOnly={user.role !== "owner"} />
              </div>
            ) : tab === "import" ? (
              <LotImport readOnly={user.role !== "owner"} initial={JSON.parse(JSON.stringify(await q(`select i.id::int, i.source, i.notes, i.collected_at, i.total, i.valid, i.created_at, coalesce(nullif(u.name,''), u.phone) as who
                from lot_imports i left join users u on u.id = i.created_by order by i.created_at desc limit 30`).catch(() => [])))} />
            ) : tab === "requisites" ? (
              <RequisitesForm initial={await getRequisites()} readOnly={user.role !== "owner"} />
            ) : (
              <TariffEditor
                readOnly={user.role !== "owner"}
                initial={await (async () => {
                  const [tariffs, fx, hist] = await Promise.all([editableTariffs(), fxState(), history()]);
                  return { tariffs, fx, rates: effectiveRates(fx), history: JSON.parse(JSON.stringify(hist)) };
                })()}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
