import type { Metadata } from "next";
import { currentUser } from "@/lib/server/auth";
import { editableTariffs, effectiveRates, fxState, history } from "@/lib/server/settings";
import { TariffEditor } from "@/components/admin/TariffEditor";
import { LoginGate } from "@/components/admin/LoginGate";

export const metadata: Metadata = { title: "Кабинет владельца", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "tariffs", label: "Тарифы и курсы", ready: true },
  { key: "leads", label: "Заявки", ready: false, note: "этап 4" },
  { key: "lots", label: "Лоты и подборка", ready: false, note: "этап 6" },
  { key: "staff", label: "Сотрудники", ready: false, note: "позже" },
];

export default async function AdminPage() {
  const user = await currentUser();
  const staff = user && (user.role === "owner" || user.role === "manager");

  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-h">
          <div><div className="eyebrow">Кабинет владельца</div><h1 style={{ fontSize: "clamp(24px,3.4vw,34px)" }}>Nomacars: управление</h1></div>
          {user && <span className="note">{user.name || user.phone} · {user.role === "owner" ? "владелец" : user.role === "manager" ? "менеджер" : "клиент"}</span>}
        </div>

        {!user ? (
          <LoginGate text="Войдите с номером владельца, чтобы управлять тарифами и заявками." />
        ) : !staff ? (
          <div className="panel empty"><b>Нет доступа</b><span>Этот раздел доступен только владельцу и менеджерам компании.</span></div>
        ) : (
          <>
            <nav className="tabs" aria-label="Разделы кабинета" style={{ marginBottom: 16 }}>
              {TABS.map((t) => (
                <button key={t.key} aria-selected={t.key === "tariffs"} disabled={!t.ready} title={t.ready ? undefined : `Появится: ${t.note}`}
                  style={t.ready ? undefined : { opacity: 0.55, cursor: "not-allowed" }}>
                  {t.label}{!t.ready && <small style={{ marginLeft: 6, fontSize: 11 }}>· {t.note}</small>}
                </button>
              ))}
            </nav>
            <TariffEditor
              readOnly={user.role !== "owner"}
              initial={await (async () => {
                const [tariffs, fx, hist] = await Promise.all([editableTariffs(), fxState(), history()]);
                return { tariffs, fx, rates: effectiveRates(fx), history: JSON.parse(JSON.stringify(hist)) };
              })()}
            />
          </>
        )}
      </div>
    </section>
  );
}
