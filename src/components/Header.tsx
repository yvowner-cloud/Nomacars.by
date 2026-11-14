"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./Providers";
import { COMPANY } from "@/lib/company";

export interface Upcoming { iso: string; auction: string; count: number }

const dm = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

export function Header({ upcoming }: { upcoming: Upcoming[] }) {
  const { country, setCountry, user, openLogin, logout } = useApp();
  const path = usePathname();
  const [mega, setMega] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setMega(false); }, [path]);
  useEffect(() => {
    if (!mega) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMega(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMega(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [mega]);

  const cur = (href: string) => (path === href ? "page" : undefined);

  return (
    <header>
      <div className="top">
        <div className="wrap">
          <div className="top-links">
            <span className="cty" role="group" aria-label="Страна доставки">
              <button aria-pressed={country === "by"} onClick={() => setCountry("by")}>Беларусь</button>
              <button aria-pressed={country === "ru"} onClick={() => setCountry("ru")}>Россия</button>
            </span>
            <Link href="/#how">Доставка</Link>
            <Link href="/calc">Растаможка</Link>
            <span className="num">{COMPANY.phone}</span>
          </div>
          <Link href="/" className="logo" aria-label={`${COMPANY.brand}, на главную`}>
            <span className="logo-small">Авто<br />с аукционов<br />США</span>
            <span className="logo-big">NOMACARS</span>
          </Link>
        </div>
      </div>

      <nav className="nav" aria-label="Основное меню" ref={ref} onMouseLeave={() => setMega(false)}>
        <div className="wrap nav-in">
          <Link href="/" className="nav-home" aria-label="Главная" aria-current={cur("/")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3z" /></svg>
          </Link>
          {user ? (
            <button onClick={logout} title="Выйти">{user.name.split(" ")[0]} · Выйти</button>
          ) : (
            <>
              <button onClick={() => openLogin()}>Вход</button>
              <button onClick={() => openLogin()}>Регистрация</button>
            </>
          )}
          <button aria-expanded={mega} aria-haspopup="true" onClick={() => setMega((m) => !m)} onMouseEnter={() => setMega(true)}>Купить</button>
          <Link href="/catalog" aria-current={cur("/catalog")} onMouseEnter={() => setMega(false)}>Поиск</Link>
          <Link href="/calc" aria-current={cur("/calc")} onMouseEnter={() => setMega(false)}>Калькулятор</Link>
          <Link href="/sold" aria-current={cur("/sold")} onMouseEnter={() => setMega(false)}>Цены выкупа</Link>
          <Link href="/#how" onMouseEnter={() => setMega(false)}>Как купить</Link>
          <Link href="/#contacts" onMouseEnter={() => setMega(false)}>Контакты</Link>
        </div>

        {mega && (
          <div className="mega" onMouseEnter={() => setMega(true)}>
            <div className="wrap mega-cols">
              <div className="mega-col">
                <h3>Ближайшие торги</h3>
                <ul className="chev">
                  {upcoming.slice(0, 5).map((u) => (
                    <li key={u.iso + u.auction}><Link href={`/catalog?auction=${u.auction}`}>{u.auction}: торги {dm(u.iso)} · {u.count} шт.</Link></li>
                  ))}
                  <li className="plain"><hr /></li>
                  <li><Link href="/catalog?sort=date">Календарь торгов</Link></li>
                </ul>
              </div>
              <div className="mega-col">
                <h3>Каталог</h3>
                <ul className="chev">
                  <li><Link href="/catalog?top=1">Топ недели</Link></li>
                  <li><Link href="/catalog">Все лоты подборки</Link></li>
                  <li><Link href="/catalog?body=suv">Кроссоверы и SUV</Link></li>
                  <li><Link href="/catalog?body=sedan">Седаны</Link></li>
                  <li><Link href="/catalog?fuel=Гибрид">Гибриды</Link></li>
                  <li><Link href="/catalog?fuel=Электро">Электромобили</Link></li>
                </ul>
              </div>
              <div className="mega-col">
                <h3>Аукционы</h3>
                <ul className="chev">
                  <li><Link href="/catalog?auction=Copart">Лоты Copart</Link></li>
                  <li><Link href="/catalog?auction=IAAI">Лоты IAAI</Link></li>
                  <li><Link href="/sold">Прошедшие торги</Link></li>
                  <li><Link href="/calc">Калькулятор под ключ</Link></li>
                </ul>
              </div>
              <div className="mega-col">
                <h3>С чего начать</h3>
                <ul className="chev">
                  {!user && (
                    <li className="plain">
                      <button className="reg-badge" onClick={() => { setMega(false); openLogin(); }}>Регистра&shy;ция</button>
                    </li>
                  )}
                  <li><Link href="/#how">Как купить</Link></li>
                  <li><Link href="/#faq">Вопросы и ответы</Link></li>
                  <li><Link href="/#contacts">Связаться с нами</Link></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
