"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "./Providers";
import { COMPANY } from "@/lib/company";

const MENU = [
  ["/", "Главная"],
  ["/catalog", "Каталог лотов"],
  ["/catalog?top=1", "Топ недели"],
  ["/sold", "Прошедшие торги"],
  ["/calc", "Калькулятор"],
  ["/#how", "Как купить"],
  ["/#contacts", "Контакты"],
] as const;

export function Header() {
  const { country, setCountry, user, openLogin, logout } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <header>
      <div className="util">
        <div className="wrap">
          <div className="util-l">
            <span className="num">{COMPANY.phone}</span>
            <span>Telegram: {COMPANY.telegram}</span>
          </div>
          <div className="util-r">
            <span className="cty" role="group" aria-label="Страна доставки">
              <button aria-pressed={country === "by"} onClick={() => setCountry("by")}>РБ</button>
              <button aria-pressed={country === "ru"} onClick={() => setCountry("ru")}>РФ</button>
            </span>
            {user ? (
              <>
                <span>{user.name}</span>
                <button onClick={logout}>Выйти</button>
              </>
            ) : (
              <button onClick={() => openLogin()}>Вход / Регистрация</button>
            )}
          </div>
        </div>
      </div>
      <div className="mast">
        <div className="wrap">
          <Link href="/" className="logo" aria-label={`${COMPANY.brand}, на главную`}>
            <span className="logo-mark">NC</span>
            <span className="logo-text">{COMPANY.brand.toUpperCase()}<small>АВТО С АУКЦИОНОВ США</small></span>
          </Link>
          <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); router.push(`/catalog${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); }}>
            <input id="site-search" aria-label="Поиск" placeholder="Марка, модель, номер лота или VIN" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit">Найти</button>
          </form>
          <div className="mast-cta">
            {user
              ? <Link className="btn btn-dark btn-sm" href="/catalog?watch=1">Избранное</Link>
              : <button className="btn btn-red btn-sm" onClick={() => openLogin()}>Регистрация</button>}
          </div>
        </div>
      </div>
      <nav className="menu" aria-label="Основное меню">
        <div className="wrap">
          {MENU.map(([href, label]) => (
            <Link key={href} href={href} aria-current={href === path ? "page" : undefined}>{label}</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
