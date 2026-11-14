import Link from "next/link";
import { COMPANY } from "@/lib/company";

export function Footer() {
  return (
    <footer id="contacts">
      <div className="wrap">
        <div>
          <h3>{COMPANY.brand}</h3>
          <p style={{ margin: 0, maxWidth: "46ch" }}>
            Пригон автомобилей с аукционов Copart и IAAI в Беларусь и Россию. Подборка проходных лотов 3–5 лет обновляется каждую неделю.
          </p>
        </div>
        <div>
          <h3>Контакты</h3>
          <nav>
            <span className="num">{COMPANY.phone}</span>
            <span>Telegram: {COMPANY.telegram}</span>
            <span>WhatsApp: {COMPANY.whatsapp}</span>
            <span>{COMPANY.office}</span>
            <span>{COMPANY.hours}</span>
          </nav>
        </div>
        <div>
          <h3>Разделы</h3>
          <nav>
            <Link href="/catalog">Каталог лотов</Link>
            <Link href="/sold">Реальные цены выкупа</Link>
            <Link href="/calc">Калькулятор под ключ</Link>
            <Link href="/#how">Как купить</Link>
          </nav>
        </div>
      </div>
      <div className="legal">
        <div className="wrap">© {COMPANY.brand}, {COMPANY.domain}. Расчёты на сайте ориентировочные, точную сумму фиксирует менеджер. Copart и IAAI — торговые марки их владельцев.</div>
      </div>
    </footer>
  );
}
