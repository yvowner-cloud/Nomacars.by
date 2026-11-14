import Link from "next/link";
import { LotCard } from "@/components/LotCard";
import { QuickFind } from "@/components/QuickFind";
import { activeLots, pastLots, saleDate } from "@/lib/lots";
import { COMPANY } from "@/lib/company";

export const dynamic = "force-dynamic"; // демо-даты торгов считаются от «сегодня»

export default function Home() {
  const active = activeLots();
  const top = active.filter((l) => l.top).sort((a, b) => b.aiScore - a.aiScore);
  const past = pastLots();
  const makes = [...new Set(active.map((l) => l.make))].sort();

  // календарь ближайших торгов: группировка по дню и аукциону
  const days = new Map<string, { date: Date; auction: string; count: number }>();
  for (const l of active) {
    const d = saleDate(l);
    const key = `${d.toDateString()}-${l.auction}`;
    const cur = days.get(key);
    if (cur) cur.count++; else days.set(key, { date: d, auction: l.auction, count: 1 });
  }
  const cal = [...days.values()].sort((a, b) => +a.date - +b.date).slice(0, 8);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <div className="eyebrow" style={{ color: "#ff8a99" }}>Copart · IAAI → Беларусь и Россия</div>
            <h1 style={{ marginTop: 8 }}>Авто из США под ключ с понятным расчётом</h1>
            <p>
              Каждую неделю ИИ просматривает тысячи лотов и оставляет лучшие: проходные машины 3–5 лет с минимальными
              повреждениями. Вы выбираете, мы торгуемся, везём и растаможиваем.
            </p>
            <div className="hero-stats">
              <div><b className="num">{active.length}</b><span>лотов в подборке</span></div>
              <div><b>55–85</b><span>дней до выдачи</span></div>
              <div><b className="num">$ {COMPANY.serviceFee}</b><span>наши услуги, фиксированно</span></div>
            </div>
          </div>
          <div className="hero-find">
            <div className="panel-h">Быстрый поиск лота</div>
            <QuickFind makes={makes} />
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-h"><h2>Ближайшие торги</h2><Link href="/catalog">Все лоты →</Link></div>
          <div className="cal">
            {cal.map((c) => (
              <Link key={`${c.date.toDateString()}-${c.auction}`} href={`/catalog?auction=${c.auction}`}>
                <span className="d"><b>{c.date.getDate()}</b><span>{c.date.toLocaleDateString("ru-RU", { month: "short" })}</span></span>
                <strong>{c.auction}</strong>
                <span className="note">{c.count} {c.count === 1 ? "лот" : c.count < 5 ? "лота" : "лотов"} из подборки</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-h"><h2>Топ недели</h2><Link href="/catalog?top=1">Смотреть все →</Link></div>
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
          <div className="sec-h"><h2>Реальные цены выкупа</h2><Link href="/sold">Все прошедшие торги →</Link></div>
          <div className="grid">{past.map((l) => <LotCard key={l.id} lot={l} />)}</div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div>
            <h2>Не нашли нужную машину?</h2>
            <p>Зарегистрируйтесь, чтобы видеть цены под ключ, или опишите запрос, и менеджер подберёт лоты под ваш бюджет.</p>
          </div>
          <Link className="btn btn-dark" href="/calc">Рассчитать свою машину</Link>
        </div>
      </section>

      <section className="sec">
        <div className="wrap two">
          <div>
            <div className="sec-h"><h2>Частые вопросы</h2></div>
            <details className="faq"><summary>Почему только машины 3–5 лет?</summary><p>Для автомобилей этого возраста действует льготная ставка пошлины. Возраст проверяем на дату растаможки, а не на день торгов.</p></details>
            <details className="faq"><summary>Почему цены видны только после входа?</summary><p>Итог зависит от страны и актуальных тарифов. После входа по номеру телефона вы видите цену под ключ по каждому лоту.</p></details>
            <details className="faq"><summary>Как вы отбираете лоты?</summary><p>ИИ отсекает утопленников, пожары, машины не на ходу и с проблемными документами, затем оценивает фото повреждений и стоимость ремонта.</p></details>
            <details className="faq"><summary>Нужна ли предоплата?</summary><p>Нет. Счёт за лот выставляется после выигрыша торгов.</p></details>
          </div>
          <div>
            <div className="sec-h"><h2>Офис</h2></div>
            <div className="panel box">
              <b>{COMPANY.office}</b>
              <span className="muted">{COMPANY.hours}</span>
              <span className="num">{COMPANY.phone}</span>
              <span>Telegram: {COMPANY.telegram} · WhatsApp: {COMPANY.whatsapp}</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
