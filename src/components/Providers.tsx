"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Country } from "@/lib/types";

/**
 * Этап 1: демо-вход (код 1234), страна, избранное — в localStorage браузера.
 * Этап 2: заменить на Supabase Auth (вход по SMS) и профиль в БД.
 */
interface User { name: string; phone: string }
interface Ctx {
  country: Country;
  setCountry: (c: Country) => void;
  user: User | null;
  login: (u: User, c?: Country) => void;
  logout: () => void;
  openLogin: (after?: () => void) => void;
  watch: number[];
  toggleWatch: (id: number) => void;
  toast: (t: string) => void;
  ready: boolean;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(C);
  if (!c) throw new Error("useApp вне Providers");
  return c;
};

const KEY = "nomacars-demo-v1";
const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
};
const write = (v: object) => {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* приватный режим */ }
};

export function Providers({ children }: { children: ReactNode }) {
  const [country, setCountryS] = useState<Country>("by");
  const [user, setUser] = useState<User | null>(null);
  const [watch, setWatch] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState<null | { after?: () => void }>(null);

  useEffect(() => {
    const s = read();
    if (s.country === "by" || s.country === "ru") setCountryS(s.country);
    if (s.user) setUser(s.user);
    if (Array.isArray(s.watch)) setWatch(s.watch);
    setReady(true);
  }, []);
  useEffect(() => { if (ready) write({ country, user, watch }); }, [country, user, watch, ready]);
  useEffect(() => {
    if (!toastText) return;
    const t = setTimeout(() => setToastText(null), 2600);
    return () => clearTimeout(t);
  }, [toastText]);

  const toast = useCallback((t: string) => setToastText(t), []);
  const value: Ctx = {
    country,
    setCountry: setCountryS,
    user,
    login: (u, c) => { setUser(u); if (c) setCountryS(c); },
    logout: () => { setUser(null); toast("Вы вышли из аккаунта"); },
    openLogin: (after) => setLoginOpen({ after }),
    watch,
    toggleWatch: (id) => {
      const doIt = () => setWatch((w) => {
        const has = w.includes(id);
        toast(has ? "Убрано из избранного" : "Добавлено в избранное");
        return has ? w.filter((x) => x !== id) : [...w, id];
      });
      if (user) doIt(); else setLoginOpen({ after: doIt });
    },
    toast,
    ready,
  };

  return (
    <C.Provider value={value}>
      {children}
      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(null)}
          onDone={(u, c) => {
            value.login(u, c);
            const after = loginOpen.after;
            setLoginOpen(null);
            toast("Готово, цены открыты");
            if (after) setTimeout(after, 0);
          }}
          country={country}
        />
      )}
      {toastText && <div className="toast" role="status">{toastText}</div>}
    </C.Provider>
  );
}

function LoginModal({ onClose, onDone, country }: { onClose: () => void; onDone: (u: User, c: Country) => void; country: Country }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cty, setCty] = useState<Country>(country);
  const [agree, setAgree] = useState(true);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const phoneOk = /^\+?(375|7)\d{9,10}$/.test(phone.replace(/[\s()-]/g, ""));

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
            if (!phoneOk) return setErr("Введите номер в формате +375 29 123-45-67 или +7 916 123-45-67");
            if (!agree) return setErr("Нужно согласие на обработку персональных данных");
            setErr(""); setStep(2);
          }}>
            <p className="muted" style={{ margin: 0 }}>После входа станут видны цены под ключ, избранное и личный кабинет.</p>
            <label>Имя<input className="field" id="l-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required /></label>
            <label>Телефон<input className="field" id="l-phone" inputMode="tel" placeholder="+375 29 123-45-67" value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
            <label>Страна доставки
              <select className="field" id="l-cty" value={cty} onChange={(e) => setCty(e.target.value as Country)}>
                <option value="by">Беларусь</option><option value="ru">Россия</option>
              </select>
            </label>
            <label style={{ display: "flex", gap: 8, fontWeight: 500 }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> Согласен на обработку персональных данных
            </label>
            {err && <div className="err">{err}</div>}
            <button className="btn btn-red" type="submit">Получить код по SMS</button>
          </form>
        ) : (
          <form className="box" onSubmit={(e) => {
            e.preventDefault();
            if (code !== "1234") return setErr("Неверный код. Проверьте SMS и попробуйте ещё раз.");
            onDone({ name: name.trim() || "Клиент", phone }, cty);
          }}>
            <p className="muted" style={{ margin: 0 }}>Код отправлен на {phone}.</p>
            <label>Код из SMS<input className="field mono" id="l-code" inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value)} autoFocus /></label>
            <div className="hint">Демо-версия: введите код 1234. Настоящие SMS подключаются на этапе 2.</div>
            {err && <div className="err">{err}</div>}
            <button className="btn btn-red" type="submit">Войти</button>
            <button className="lock-cta" type="button" onClick={() => { setStep(1); setCode(""); setErr(""); }}>Изменить номер</button>
          </form>
        )}
      </div>
    </div>
  );
}
