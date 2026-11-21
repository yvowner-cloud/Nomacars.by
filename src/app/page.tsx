import Link from "next/link";
import { LotCard } from "@/components/LotCard";
import { PickButton } from "@/components/LeadForms";
import { LotImage } from "@/components/LotImage";
import { TurnkeyPrice } from "@/components/Price";
import { LiveCountdown } from "@/components/Timer";
import { Reveal } from "@/components/Reveal";
import { RouteMap, TopLots } from "@/components/HomeBlocks";
import { activeOf, pastOf, upcomingFrom } from "@/lib/lots";
import { getCatalog } from "@/lib/server/catalog";
import { COMPANY, CONTACT_LINKS } from "@/lib/company";
import { currentUser } from "@/lib/server/auth";
import { toPublicAll } from "@/lib/server/public-lots";
import { getTariffs } from "@/lib/server/settings";
import { engineStr, kmStr, money } from "@/lib/format";

export const dynamic = "force-dynamic";

const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "лот" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "лота" : "лотов");
const dm = (d: Date) => d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "Europe/Minsk" });

export default async function Home() {
  const [user, T, { lots }] = await Promise.all([currentUser(), getTariffs(), getCatalog()]);
  const active = toPublicAll(activeOf(lots), user, T);
  const top = active.filter((l) => l.top).sort((a, b) => b.aiScore - a.aiScore);
  const rest = active.filter((l) => !l.top).sort((a, b) => b.aiScore - a.aiScore);
  const past = toPublicAll(pastOf(lots), user, T).slice(0, 8);
  const cal = upcomingFrom(lots);
  // живой лот на первом экране: лучший лот с фото, торги которого ещё впереди
  const hero = [...top, ...rest].find((l) => l.photos?.length && Date.parse(l.saleAt) > Date.now());

  // бегущая строка: ближайшие торги, повторены, чтобы строка шла без разрыва
  const tk = cal.slice(0, 10);
  const loop = tk.length ? Array.from({ length: Math.max(2, Math.ceil(12 / tk.length)) * 2 }, () => tk).flat() : [];

  return (
    <>
      <section className="x-hero">
        <div className="wrap x-hero-in">
          <div className="x-hero-text">
            <span className="x-kicker x-rise x-d1">Copart · IAAI · Manheim</span>
            <h1>
              <span className="x-rise x-d2">Авто из США</span>
              <span className="x-rise x-d3 x-accent">под ключ</span>
              <span className="x-rise x-d4">в Беларусь и Россию</span>
            </h1>
            <div className="x-bar" aria-hidden="true" />
            <p className="x-rise x-d5">
              Каждую неделю отбираем проходные машины 3–5 лет с минимальными повреждениями. Торгуемся, везём через
              Клайпеду или Поти, растамаживаем и выдаём с документами. Наши услуги — ${T.service}, фиксированно.
            </p>
            <div className="x-cta-row x-rise x-d6">
              <Link className="btn btn-red x-btn" href="/catalog">Смотреть лоты <span className="x-arr" aria-hidden="true">→</span></Link>
              <Link className="btn x-btn x-btn-line" href="/calc">Рассчитать под ключ</Link>
            </div>
          </div>

          <div className="x-live-wrap">
            {hero ? (
              <Link className="x-live x-rise x-d4" href={`/lot/${hero.slug}`}>
                <div className="ph">
                  <LotImage lot={hero} eager />
                  <span className="x-badge-live"><span className="x-dot" aria-hidden="true" />{hero.top ? "Топ недели" : "Подборка Ncars"}</span>
                  <span className="lotno mono">{hero.auction} · {hero.lotNo}</span>
                </div>
                <div className="x-live-body">
                  <h2>{hero.year} {hero.make} {hero.model} {hero.trim}</h2>
                  <div className="x-live-meta">
                    <span>{kmStr(hero.miles)}</span>
                    <span>{engineStr(hero.cc, hero.hp, hero.hpEstimated)}</span>
                    <span>{hero.conditionGrade != null ? `CR ${hero.conditionGrade.toFixed(1)} из 5` : hero.damage}</span>
                  </div>
                  <div className="x-live-nums">
                    <div><small>Текущая ставка</small><div className="x-live-bid num">{money(hero.bid ?? 0)}</div></div>
                    <div><small>До торгов</small><LiveCountdown at={hero.saleAt} className="x-live-timer" /></div>
                  </div>
                  <div className="x-live-price"><TurnkeyPrice lot={hero} /></div>
                </div>
              </Link>
            ) : (
              <div className="x-live-empty x-rise x-d4">
                <h2>Подборка обновляется</h2>
                <p className="muted" style={{ margin: 0 }}>Скоро здесь появятся лучшие лоты недели. А пока опишите, какую машину ищете, — подберём под ваш бюджет.</p>
                <span style={{ justifySelf: "start" }}><PickButton /></span>
              </div>
            )}
          </div>
        </div>
      </section>

      {loop.length > 0 && (
        <div className="x-ticker" aria-label="Ближайшие торги">
          <div className="x-track">
            {loop.map((c, i) => (
              <Link key={i} className="x-tk" href={`/catalog?auction=${c.auction}`} tabIndex={i < tk.length ? 0 : -1} aria-hidden={i >= tk.length}>
                <i aria-hidden="true">●</i><b>{c.auction}</b> торги {dm(c.date)} · {c.count} {plural(c.count)} из подборки
              </Link>
            ))}
          </div>
        </div>
      )}

      <section className="x-sec x-sec-grey">
        <div className="wrap">
          <div className="x-head">
            <div><span className="eyebrow">Подборка Ncars</span><h2>Топ недели</h2></div>
            <Link className="btn btn-red x-btn" href="/catalog?top=1">Весь топ <span className="x-arr" aria-hidden="true">→</span></Link>
          </div>
          {top.length || rest.length ? <TopLots lots={top.length >= 4 ? top : [...top, ...rest]} /> : (
            <div className="panel empty"><b>Подборка обновляется</b><span>Скоро здесь появятся лучшие лоты недели. А пока опишите, какую машину ищете, и мы подберём её под ваш бюджет.</span><PickButton /></div>
          )}
        </div>
      </section>

      <section className="x-sec" id="how">
        <div className="wrap">
          <div className="x-head"><div><span className="eyebrow">Как это работает</span><h2>Четыре шага до ключей</h2></div></div>
          <Reveal className="x-steps">
            <div className="x-step"><div className="x-step-n">01</div><h3>Выбор</h3><p>Выбираете лот из подборки или присылаете запрос — подберём под бюджет.</p></div>
            <div className="x-step"><div className="x-step-n">02</div><h3>Торги</h3><p>Согласуем максимальную ставку и торгуемся за вас. Счёт — только после выигрыша.</p></div>
            <div className="x-step"><div className="x-step-n">03</div><h3>Доставка</h3><p>Со стоянки аукциона на склад, контейнер до Клайпеды или Поти, автовоз до вашего города.</p></div>
            <div className="x-step"><div className="x-step-n">04</div><h3>Выдача</h3><p>Растаможка, документы и ключи. Каждый этап виден в личном кабинете.</p></div>
          </Reveal>
        </div>
      </section>

      <section className="x-sec x-sec-panel" id="routes">
        <div className="wrap">
          <div className="x-head"><div><span className="eyebrow">Доставка</span><h2>Два морских маршрута</h2></div></div>
          <Reveal>
            <RouteMap />
            <div className="x-routes">
              <div className="x-route">
                <h3>Через Клайпеду</h3>
                <p>Основной маршрут. Со складов в Нью-Джерси, Джорджии, Флориде, Техасе и Калифорнии — контейнером до Литвы, оттуда автовозом.</p>
              </div>
              <div className="x-route">
                <h3>Через Поти</h3>
                <p>Для машин, которые не проходят ограничения на ввоз через Литву (клиренс, объём двигателя). Маршрут подтверждает менеджер.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="x-cta">
        <div className="wrap">
          <div>
            <h2>Посчитаем под ключ за минуту</h2>
            <p>Ставка, сбор аукциона, доставка, пошлина и утильсбор — по каждому маршруту отдельно.</p>
          </div>
          <Link className="btn x-btn x-btn-white" href="/calc">Открыть калькулятор <span className="x-arr" aria-hidden="true">→</span></Link>
        </div>
      </section>

      {past.length > 0 && (
        <section className="x-sec x-sec-grey">
          <div className="wrap">
            <div className="x-head">
              <div><span className="eyebrow">Архив</span><h2>Реальные цены выкупа</h2></div>
              <Link className="btn btn-red x-btn" href="/sold">Прошедшие аукционы <span className="x-arr" aria-hidden="true">→</span></Link>
            </div>
            <Reveal className="grid">{past.map((l) => <LotCard key={l.id} lot={l} />)}</Reveal>
          </div>
        </section>
      )}

      <section className="x-sec" id="faq">
        <div className="wrap two">
          <div>
            <div className="x-head"><div><span className="eyebrow">FAQ</span><h2>Вопросы и ответы</h2></div></div>
            <details className="faq"><summary>Почему только машины 3–5 лет?</summary><p>Для автомобилей этого возраста действует льготная ставка пошлины. Возраст проверяем на дату растаможки, а не на день торгов.</p></details>
            <details className="faq"><summary>Почему цены видны только после входа?</summary><p>Итог зависит от страны и актуальных тарифов. После входа по номеру телефона вы видите цену под ключ по каждому лоту.</p></details>
            <details className="faq"><summary>Как вы отбираете лоты?</summary><p>Система Ncars отсекает утопленников, пожары, машины не на ходу и с проблемными документами, затем оценивает фото повреждений и стоимость ремонта.</p></details>
            <details className="faq"><summary>Нужна ли предоплата?</summary><p>Нет. Счёт за лот выставляется после выигрыша торгов.</p></details>
          </div>
          <div>
            <div className="x-head"><div><span className="eyebrow">Контакты</span><h2>Офис</h2></div></div>
            <div className="panel">
              <div className="panel-h">{COMPANY.office}</div>
              <div className="box">
                <span className="muted">{COMPANY.officeFull} · <a href={COMPANY.officeMap} target="_blank" rel="noreferrer">на карте</a></span>
                <span className="muted">{COMPANY.hours}</span>
                <a className="num" href={CONTACT_LINKS.tel} style={{ fontSize: 18, fontWeight: 700, color: "inherit" }}>{COMPANY.phone}</a>
                <span>
                  <a href={CONTACT_LINKS.telegram} target="_blank" rel="noreferrer">Telegram</a>{" · "}
                  <a href={CONTACT_LINKS.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>{" · "}
                  <a href={CONTACT_LINKS.viber}>Viber</a>{" · "}
                  <a href={CONTACT_LINKS.instagram} target="_blank" rel="noreferrer">Instagram</a>
                </span>
                <span style={{ justifySelf: "start" }}><PickButton /></span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
