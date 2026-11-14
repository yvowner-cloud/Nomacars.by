import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BidBox, LotGallery, LotTabs } from "@/components/LotPanel";
import { LotCard } from "@/components/LotCard";
import { LOTS, graceUntil, lotBySlug, saleDate } from "@/lib/lots";
import { aiReview } from "@/lib/ai";
import { ageAtCustoms } from "@/lib/calc";
import { DEFAULT_TARIFFS } from "@/lib/tariffs";
import { US_STATES } from "@/lib/tariffs";
import { engineStr, fmt, kmStr, money } from "@/lib/format";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = lotBySlug((await params).slug);
  if (!l) return { title: "Лот не найден" };
  const t = `${l.year} ${l.make} ${l.model} ${l.trim} с аукциона ${l.auction}`;
  return {
    title: t,
    description: `${t}: ${kmStr(l.miles)}, ${engineStr(l.cc, l.hp)}, повреждение: ${l.damage.toLowerCase()}. Разбор Nomacars и расчёт под ключ в РБ и РФ.`,
    openGraph: { title: t },
  };
}

export default async function LotPage({ params }: P) {
  const l = lotBySlug((await params).slug);
  if (!l) notFound();
  const ai = aiReview(l);
  const st = US_STATES[l.state];
  const age = ageAtCustoms(l.year, l.month, saleDate(l), DEFAULT_TARIFFS.deliveryDays);
  const similar = LOTS.filter((x) => x.id !== l.id && x.status === "active" && x.body === l.body)
    .sort((a, b) => b.aiScore - a.aiScore).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Car",
    name: `${l.year} ${l.make} ${l.model} ${l.trim}`, brand: l.make, model: l.model, vehicleModelDate: String(l.year),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: Math.round(l.miles * 1.609), unitCode: "KMT" },
    fuelType: l.fuel, bodyType: l.body === "suv" ? "SUV" : "Sedan",
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
          <span className="score">Оценка Nomacars {l.aiScore}/100</span>
        </div>

        <div className="lot">
          <div style={{ display: "grid", gap: 16 }}>
            <LotGallery lot={l} />
            <LotTabs
              ai={
                <div className="box ai">
                  <p style={{ margin: 0 }}>{ai.summary}</p>
                  <div>
                    <h3 style={{ marginBottom: 4 }}>Повреждения простыми словами</h3>
                    <p style={{ margin: 0 }} className="muted">{ai.plain}</p>
                    <p style={{ margin: "6px 0 0", fontWeight: 700 }}>Ремонт: примерно {money(l.repair[0])}–{fmt(l.repair[1])}</p>
                  </div>
                  <div className="two">
                    <div><h3 style={{ marginBottom: 6, color: "var(--green)" }}>Почему стоит взять</h3><ul>{ai.why.map((x) => <li key={x}>{x}</li>)}</ul></div>
                    <div><h3 style={{ marginBottom: 6, color: "var(--warn)" }}>Риски</h3><ul>{ai.risks.map((x) => <li key={x}>{x}</li>)}</ul></div>
                  </div>
                </div>
              }
              specs={
                <dl className="kv">
                  <dt>VIN</dt><dd className="mono">{l.vin}</dd>
                  <dt>Номер лота</dt><dd className="mono">{l.auction} · {l.lotNo}</dd>
                  <dt>Дата выпуска</dt><dd>{String(l.month).padStart(2, "0")}.{l.year}</dd>
                  <dt>Пробег</dt><dd className="num">{fmt(l.miles)} mi · {kmStr(l.miles)}</dd>
                  <dt>Двигатель</dt><dd>{l.cc ? `${fmt(l.cc)} см³ · ` : ""}{l.hp} л.с. · {l.fuel}</dd>
                  <dt>Кузов</dt><dd>{l.body === "suv" ? "Кроссовер / SUV" : "Седан"}</dd>
                  <dt>Повреждение</dt><dd>{l.damage}</dd>
                  <dt>Площадка</dt><dd>{st.name}, порт {st.port}</dd>
                  <dt>Льготная пошлина</dt><dd>до {graceUntil(l)}</dd>
                  <dt>Возраст на таможне</dt><dd>{age.toFixed(1).replace(".", ",")} года</dd>
                </dl>
              }
            />
          </div>
          <BidBox lot={l} />
        </div>

        {similar.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <div className="sec-h"><h2>Похожие лоты</h2></div>
            <div className="grid">{similar.map((x) => <LotCard key={x.id} lot={x} />)}</div>
          </div>
        )}
      </div>
    </section>
  );
}
