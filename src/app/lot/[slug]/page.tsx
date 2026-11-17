import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BidBox, LotGallery, LotTabs } from "@/components/LotPanel";
import { LotCard } from "@/components/LotCard";
import { graceUntil, saleDate } from "@/lib/lots";
import { getCatalog } from "@/lib/server/catalog";
import { aiReview } from "@/lib/ai";
import { ageAtCustoms } from "@/lib/calc";
import { stateInfo } from "@/lib/geo";
import { engineStr, fmt, kmStr, money } from "@/lib/format";
import { currentUser } from "@/lib/server/auth";
import { lotCalc, toPublic, toPublicAll } from "@/lib/server/public-lots";
import { getTariffs } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ slug: string }> };

const bySlug = async (slug: string) => (await getCatalog()).lots.find((l) => l.slug === slug);

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = await bySlug((await params).slug);
  if (!l) return { title: "Лот не найден" };
  const t = `${l.year} ${l.make} ${l.model} ${l.trim} с аукциона ${l.auction}`;
  return {
    title: t,
    description: `${t}: ${kmStr(l.miles)}, ${engineStr(l.cc, l.hp, l.hpEstimated)}, повреждение: ${l.damage.toLowerCase()}. Разбор Ncars и расчёт под ключ в РБ и РФ.`,
    openGraph: { title: t, images: l.photos?.[0] ? [{ url: l.photos[0] }] : undefined },
  };
}

export default async function LotPage({ params }: P) {
  const l = await bySlug((await params).slug);
  if (!l) notFound();
  const { lots } = await getCatalog();
  const [user, T] = await Promise.all([currentUser(), getTariffs()]);
  const pub = toPublic(l, user, T);
  const ai = aiReview(l);
  const st = stateInfo(String(l.state));
  const age = ageAtCustoms(l.year, l.month, saleDate(l), T.deliveryDays);
  const similar = lots.filter((x) => x.id !== l.id && x.status === "active" && x.body === l.body)
    .sort((a, b) => b.aiScore - a.aiScore).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Car",
    name: `${l.year} ${l.make} ${l.model} ${l.trim}`, brand: l.make, model: l.model, vehicleModelDate: String(l.year),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: Math.round(l.miles * 1.609), unitCode: "KMT" },
    fuelType: l.fuel, bodyType: l.body === "suv" ? "SUV" : l.body === "sedan" ? "Sedan" : undefined,
    image: l.photos?.slice(0, 5),
  };

  return (
    <section className="sec">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="wrap">
        <div className="crumbs"><Link href="/catalog">Каталог</Link> / {l.make} / {l.model}</div>
        <div className="lot-head">
          <div>
            <div className="eyebrow">{l.auction} · лот {l.lotNo} · {st.name}</div>
            <h1 style={{ fontSize: "clamp(22px,3vw,32px)", marginTop: 4 }}>{l.year} {l.make} {l.model} {l.trim}</h1>
          </div>
          <span className="score">Оценка Ncars {l.aiScore}/100</span>
        </div>

        <div className="lot">
          <div style={{ display: "grid", gap: 16 }}>
            <LotGallery lot={pub} />
            <LotTabs
              ai={
                <div className="box ai">
                  <p style={{ margin: 0 }}>{ai.summary}</p>
                  <div>
                    <h3 style={{ marginBottom: 4 }}>Повреждения простыми словами</h3>
                    <p style={{ margin: 0 }} className="muted">{ai.plain}</p>
                    {l.repair[1] > 0 && <p style={{ margin: "6px 0 0", fontWeight: 700 }}>Ремонт: примерно {money(l.repair[0])}–{fmt(l.repair[1])}</p>}
                  </div>
                  <div className="two">
                    {ai.why.length > 0 && <div><h3 style={{ marginBottom: 6, color: "var(--green)" }}>Почему стоит взять</h3><ul>{ai.why.map((x) => <li key={x}>{x}</li>)}</ul></div>}
                    {ai.risks.length > 0 && <div><h3 style={{ marginBottom: 6, color: "var(--warn)" }}>Риски</h3><ul>{ai.risks.map((x) => <li key={x}>{x}</li>)}</ul></div>}
                  </div>
                </div>
              }
              specs={
                <dl className="kv">
                  <dt>VIN</dt><dd className="mono">{l.vin}</dd>
                  <dt>Номер лота</dt><dd className="mono">{l.auction} · {l.lotNo}</dd>
                  <dt>{l.monthKnown === false ? "Модельный год" : "Дата выпуска"}</dt><dd>{l.monthKnown === false ? l.year : `${String(l.month).padStart(2, "0")}.${l.year}`}</dd>
                  <dt>Пробег</dt><dd className="num">{l.miles ? `${fmt(l.miles)} mi · ${kmStr(l.miles)}` : "не указан"}{l.extra?.odometerStatus && !/actual/i.test(l.extra.odometerStatus) ? ` (${l.extra.odometerStatus})` : ""}</dd>
                  <dt>Двигатель</dt><dd>{l.extra?.engine ? `${l.extra.engine} · ` : l.cc ? `${fmt(l.cc)} см³ · ` : ""}{l.hpEstimated ? "мощность уточняется" : `${l.hp} л.с.`} · {l.fuel}</dd>
                  {l.extra?.transmission && <><dt>Коробка / привод</dt><dd>{[l.extra.transmission, l.extra.drive].filter(Boolean).join(" · ")}</dd></>}
                  <dt>Кузов</dt><dd>{l.body === "suv" ? "Кроссовер / SUV" : l.body === "sedan" ? "Седан" : "Другой"}{l.extra?.colorName ? ` · ${l.extra.colorName}` : ""}</dd>
                  <dt>Повреждение</dt><dd>{l.damage}</dd>
                  {l.conditionGrade != null && <><dt>Оценка состояния (CR)</dt><dd>{l.conditionGrade.toFixed(1)} из 5</dd></>}
                  {l.extra?.title && <><dt>Документ (title)</dt><dd>{l.extra.title}</dd></>}
                  {l.extra && l.extra.runAndDrive !== null && l.extra.runAndDrive !== undefined && <><dt>На ходу (Run and Drive)</dt><dd>{l.extra.runAndDrive ? "да" : "нет"}</dd></>}
                  {l.extra && l.extra.keys !== null && l.extra.keys !== undefined && <><dt>Ключи</dt><dd>{l.extra.keys ? "есть" : "нет"}</dd></>}
                  {l.extra?.airbags && <><dt>Подушки безопасности</dt><dd>сработали</dd></>}
                  <dt>Площадка</dt><dd>{l.extra?.city ? `${l.extra.city}, ` : ""}{st.name}, порт {st.port}</dd>
                  <dt>Льготная пошлина</dt><dd>до {graceUntil(l)}</dd>
                  <dt>Возраст на таможне</dt><dd>{age.toFixed(1).replace(".", ",")} года</dd>
                </dl>
              }
            />
          </div>
          <BidBox lot={pub} calc={lotCalc(l, user, T)} />
        </div>

        {similar.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <div className="sec-h"><h2>Похожие лоты</h2></div>
            <div className="grid">{toPublicAll(similar, user, T).map((x) => <LotCard key={x.id} lot={x} />)}</div>
          </div>
        )}
      </div>
    </section>
  );
}
