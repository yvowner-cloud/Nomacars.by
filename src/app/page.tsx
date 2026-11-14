import Link from "next/link";
import { LotCard } from "@/components/LotCard";
import { HeroSlider } from "@/components/HeroSlider";
import { CarArt } from "@/components/CarArt";
import { activeLots, pastLots, upcomingAuctions, LOTS } from "@/lib/lots";
import { COMPANY } from "@/lib/company";

export const dynamic = "force-dynamic";

const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "лот" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "лота" : "лотов");

export default function Home() {
  const active = activeLots();
  const top = active.filter((l) => l.top).sort((a, b) => b.aiScore - a.aiScore);
  const past = pastLots();
  const cal = upcomingAuctions().slice(0, 8);
  const pick = (id: number) => LOTS.find((l) => l.id === id)!;

  const tiles = [
    { t: "Кроссоверы", href: "/catalog?body=suv", bg: "#000000", lot: pick(7), n: active.filter((l) => l.body === "suv").length },
    { t: "Седаны", href: "/catalog?body=sedan", bg: "#6d6d6d", lot: pick(5), n: active.filter((l) => l.body === "sedan").length },
    { t: "Премиум", href: "/catalog?make=Mercedes-Benz", bg: "#2f6aa8", lot: pick(12), n: active.filter((l) => ["BMW", "Audi", "Mercedes-Benz"].includes(l.make)).length },
    { t: "Гибриды и электро", href: "/catalog?fuel=Электро", bg: "#9e9e9e", lot: pick(15), n: active.filter((l) => l.fuel !== "Бензин").length },
  ];

  return (
    <>
      <HeroSlider lots={[...top, ...active.filter((l) => !l.top)]} />

      <div className="wrap">
        <div className="tiles">
          {tiles.map((t) => (
            <Link key={t.t} href={t.href} className="tile">
              <b>{t.t}</b>
              <div className="tile-card" style={{ background: t.bg }}>
                <u>Смотреть лоты · {t.n}</u>
                <CarArt lot={t.lot} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <section className="band">
        <div className="wrap">
          <h2>Проходные авто из США по честной цене</h2>
          <p>Каждую неделю ИИ просматривает тысячи лотов и оставляет лучшие. Вы выбираете машину, мы торгуемся, везём морем через Клайпеду, растаможиваем и выдаём с документами. Наши услуги стоят ${COMPANY.serviceFee}, фиксированно.</p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-h"><h2>Ближайшие торги</h2><Link href="/catalog?sort=date">Все лоты ›</Link></div>
          <div className="cal">
            {cal.map((c) => (
              <Link key={`${c.date.toDateString()}-${c.auction}`} href={`/catalog?auction=${c.auction}`}>
                <span className="d"><b>{c.date.getDate()}</b><span>{c.date.toLocaleDateString("ru-RU", { month: "short" })}</span></span>
                <strong>{c.auction}</strong>
                <span className="note">{c.count} {plural(c.count)} из подборки</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-h"><h2>Топ недели</h2><Link href="/catalog?top=1">Смотреть все ›</Link></div>
          <div className="grid">{top.slice(0, 8).map((l) => <LotCard key={l.id} lot={l} />)}</div>
        </div>
      </section>

      <section className="sec" id="how" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-h"><h2>Как купить автомобиль</h2></div>
          <div className="steps">
            <div className="step"><b>Выбор лота</b><span>Из подборки или по вашему запросу</span></div>
            <div className="step"><b>Торги</b><span>Согласуем максимальную ставку и торгуемся за вас</span></div>
            <div className="step"><b>Оплата</b><span>Счета в кабинете, оплата переводом</span></div>
            <div className="step"><b>Доставка по США</b><span>С площадки аукциона в порт</span></div>
            <div className="step"><b>Море</b><span>Контейнер до Клайпеды, 30–40 дней</span></div>
            <div className="step"><b>Таможня и выдача</b><span>Растаможка, документы, ключи</span></div>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-h"><h2>Реальные цены выкупа</h2><Link href="/sold">Все прошедшие торги ›</Link></div>
          <div className="grid">{past.map((l) => <LotCard key={l.id} lot={l} />)}</div>
        </div>
      </section>

      <section className="sec" id="faq" style={{ paddingTop: 0 }}>
        <div className="wrap two">
          <div>
            <div className="sec-h"><h2>Вопросы и ответы</h2></div>
            <details className="faq"><summary>Почему только машины 3–5 лет?</summary><p>Для автомобилей этого возраста действует льготная ставка пошлины. Возраст проверяем на дату растаможки, а не на день торгов.</p></details>
            <details className="faq"><summary>Почему цены видны только после входа?</summary><p>Итог зависит от страны и актуальных тарифов. После входа по номеру телефона вы видите цену под ключ по каждому лоту.</p></details>
            <details className="faq"><summary>Как вы отбираете лоты?</summary><p>ИИ отсекает утопленников, пожары, машины не на ходу и с проблемными документами, затем оценивает фото повреждений и стоимость ремонта.</p></details>
            <details className="faq"><summary>Нужна ли предоплата?</summary><p>Нет. Счёт за лот выставляется после выигрыша торгов.</p></details>
          </div>
          <div>
            <div className="sec-h"><h2>Офис</h2></div>
            <div className="panel">
              <div className="panel-h">{COMPANY.office}</div>
              <div className="box">
                <span className="muted">{COMPANY.hours}</span>
                <b className="num" style={{ fontSize: 18 }}>{COMPANY.phone}</b>
                <span>Telegram {COMPANY.telegram} · WhatsApp {COMPANY.whatsapp}</span>
                <Link className="btn btn-red" href="/catalog" style={{ justifySelf: "start" }}>Подобрать автомобиль</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
