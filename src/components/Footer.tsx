import Link from "next/link";
import { COMPANY } from "@/lib/company";
import type { Upcoming } from "./Header";
import { ToTop } from "./ToTop";

const dm = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

export function Footer({ upcoming }: { upcoming: Upcoming[] }) {
  return (
    <footer id="contacts">
      <div className="wrap foot">
        <div>
          <h3>О компании</h3>
          <p>
            {COMPANY.brand} пригоняет автомобили с аукционов Copart и IAAI в Беларусь и Россию. Каждую неделю мы
            отбираем проходные машины 3–5 лет с минимальными повреждениями, торгуемся, доставляем морем через
            Клайпеду, растаможиваем и выдаём автомобиль с документами. Каждый этап виден клиенту в личном кабинете.
          </p>
        </div>
        <div>
          <h3>Разделы</h3>
          <ul className="chev">
            <li><Link href="/">Главная</Link></li>
            <li><Link href="/catalog">Каталог</Link></li>
            <li><Link href="/catalog?top=1">Топ недели</Link></li>
            <li><Link href="/sold">Цены выкупа</Link></li>
            <li><Link href="/calc">Калькулятор</Link></li>
            <li><Link href="/#how">Как купить</Link></li>
            <li><Link href="/#faq">Вопросы и ответы</Link></li>
          </ul>
        </div>
        <div>
          <h3>Ближайшие торги</h3>
          <ul className="chev">
            {upcoming.slice(0, 8).map((u) => (
              <li key={u.iso + u.auction}><Link href={`/catalog?auction=${u.auction}`}>{u.auction} · торги {dm(u.iso)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Контакты</h3>
          <ul className="chev">
            <li><span className="num">{COMPANY.phone}</span></li>
            <li><span>Telegram {COMPANY.telegram}</span></li>
            <li><span>WhatsApp {COMPANY.whatsapp}</span></li>
            <li><span>{COMPANY.office}</span></li>
          </ul>
          <p style={{ marginTop: 10, color: "#aaa" }}>{COMPANY.hours}</p>
        </div>
      </div>
      <div className="legal">
        <div className="wrap">
          <div className="legal-t">
            {COMPANY.brand} © {new Date().getFullYear()}. Все права защищены<br />
            <Link href="/#faq">Политика конфиденциальности</Link> | <Link href="/#faq">Согласие на обработку данных</Link> | <Link href="/calc">Расчёты ориентировочные</Link>
          </div>
          <div className="soc" aria-label="Мы в соцсетях">
            <span style={{ display: "contents" }}>
              <a href="#contacts" aria-label="Telegram">TG</a>
              <a href="#contacts" aria-label="Instagram">IG</a>
              <a href="#contacts" aria-label="YouTube">YT</a>
              <a href="#contacts" aria-label="WhatsApp">WA</a>
            </span>
          </div>
        </div>
      </div>
      <ToTop />
    </footer>
  );
}
