"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Country } from "@/lib/types";

/**
 * Состояние сайта в браузере. Пользователь и избранное приходят с сервера (сессия в cookie),
 * вход — по коду из SMS через /api/auth/*. Страна гостя запоминается в браузере.
 */
export interface SiteUser { id: number; phone: string; name: string; country: Country; role: "client" | "manager" | "owner" }
interface Ctx {
  country: Country;
  setCountry: (c: Country) => void;
  user: SiteUser | null;
  logout: () => void;
  openLogin: (after?: () => void) => void;
  watch: number[];
  toggleWatch: (id: number) => void;
  toast: (t: string) => void;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(C);
  if (!c) throw new Error("useApp вне Providers");
  return c;
};

const KEY = "nomacars-country";

async function post<T>(url: string, data: unknown, method = "POST"): Promise<T> {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.");
  return j as T;
}

export function Providers({ children, initialUser, initialFavorites }: { children: ReactNode; initialUser: SiteUser | null; initialFavorites: number[] }) {
  const router = useRouter();
  const [user, setUser] = useState<SiteUser | null>(initialUser);
  const [country, setCountryS] = useState<Country>(initialUser?.country ?? "by");
  const [watch, setWatch] = useState<number[]>(initialFavorites);
  const [toastText, setToastText] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState<null | { after?: () => void }>(null);

  useEffect(() => { setUser(initialUser); setWatch(initialFavorites); if (initialUser) setCountryS(initialUser.country); }, [initialUser, initialFavorites]);
  useEffect(() => {
    if (initialUser) return;
    try { const c = localStorage.getItem(KEY); if (c === "by" || c === "ru") setCountryS(c); } catch { /* приватный режим */ }
  }, [initialUser]);
  useEffect(() => {
    if (!toastText) return;
    const t = setTimeout(() => setToastText(null), 2800);
    return () => clearTimeout(t);
  }, [toastText]);

  const toast = useCallback((t: string) => setToastText(t), []);

  const setCountry = (c: Country) => {
    setCountryS(c);
    if (user) post("/api/me", { country: c }, "PATCH").catch(() => {});
    else try { localStorage.setItem(KEY, c); } catch { /* ignore */ }
  };

  const toggleWatch = (id: number) => {
    const doIt = (list: number[]) => {
      const on = !list.includes(id);
      setWatch((w) => (on ? [...w, id] : w.filter((x) => x !== id)));
      toast(on ? "Добавлено в избранное" : "Убрано из избранного");
      post<{ favorites: number[] }>("/api/favorites", { lotId: id, on })
        .then((r) => setWatch(r.favorites))
        .catch((e) => { toast(e.message); setWatch(list); });
    };
    if (user) doIt(watch);
    else setLoginOpen({ after: () => doIt([]) });
  };

  const logout = () => {
    post("/api/auth/logout", {}).finally(() => { setUser(null); setWatch([]); toast("Вы вышли из аккаунта"); router.refresh(); });
  };

  return (
    <C.Provider value={{ country, setCountry, user, logout, openLogin: (after) => setLoginOpen({ after }), watch, toggleWatch, toast }}>
      {children}
      {loginOpen && (
        <LoginModal
          country={country}
          onClose={() => setLoginOpen(null)}
          onDone={(u, favs) => {
            setUser(u); setWatch(favs); setCountryS(u.country);
            const after = loginOpen.after;
            setLoginOpen(null);
            toast("Готово, цены открыты");
            router.refresh();
            if (after) setTimeout(after, 300);
          }}
        />
      )}
      {toastText && <div className="toast" role="status">{toastText}</div>}
    </C.Provider>
  );
}

function LoginModal({ onClose, onDone, country }: { onClose: () => void; onDone: (u: SiteUser, favs: number[]) => void; country: Country }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [normPhone, setNormPhone] = useState("");
  const [cty, setCty] = useState<Country>(country);
  const [agree, setAgree] = useState(true);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [logMode, setLogMode] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await post<{ phone: string; delivery: "sms" | "log" }>("/api/auth/send-code", { phone });
      setNormPhone(r.phone); setLogMode(r.delivery === "log"); setStep(2); setCode(""); setWait(60);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="login-h">
        <div className="panel-h" id="login-h">
          Вход по номеру телефона
          <button className="modal-x" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        {step === 1 ? (
          <form className="box" onSubmit={(e) => {
            e.preventDefault();
            if (!agree) return setErr("Нужно согласие на обработку персональных данных");
            send();
          }}>
            <p className="muted" style={{ margin: 0 }}>После входа станут видны цены под ключ, избранное и личный кабинет.</p>
            <label>Имя<input className="field" id="l-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
            <label>Телефон<input className="field" id="l-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+375 29 123-45-67" value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
            <label>Страна доставки
              <select className="field" id="l-cty" value={cty} onChange={(e) => setCty(e.target.value as Country)}>
                <option value="by">Беларусь</option><option value="ru">Россия</option>
              </select>
            </label>
            <label style={{ display: "flex", gap: 8, fontWeight: 400 }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> Согласен на обработку персональных данных
            </label>
            {err && <div className="err" role="alert">{err}</div>}
            <button className="btn btn-red" type="submit" disabled={busy}>{busy ? "Отправляем…" : "Получить код по SMS"}</button>
          </form>
        ) : (
          <form className="box" onSubmit={async (e) => {
            e.preventDefault();
            setErr(""); setBusy(true);
            try {
              const r = await post<{ user: SiteUser; favorites: number[] }>("/api/auth/verify", { phone: normPhone, code, name, country: cty });
              onDone(r.user, r.favorites);
            } catch (ex) { setErr((ex as Error).message); }
            setBusy(false);
          }}>
            <p className="muted" style={{ margin: 0 }}>Код отправлен на {normPhone}. Он действует 5 минут.</p>
            <label>Код из SMS<input className="field mono" id="l-code" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus /></label>
            {logMode && <div className="hint">SMS-сервис ещё не подключён: код записан в журнал сервера. Это временный режим проверки.</div>}
            {err && <div className="err" role="alert">{err}</div>}
            <button className="btn btn-red" type="submit" disabled={busy || code.length !== 4}>{busy ? "Проверяем…" : "Войти"}</button>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <button className="lock-cta" type="button" onClick={() => { setStep(1); setErr(""); }}>Изменить номер</button>
              <button className="lock-cta" type="button" disabled={wait > 0 || busy} onClick={send} style={wait > 0 ? { color: "var(--muted)" } : undefined}>
                {wait > 0 ? `Отправить снова через ${wait} с` : "Отправить код снова"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
