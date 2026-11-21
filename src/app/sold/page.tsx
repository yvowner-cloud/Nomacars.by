import type { Metadata } from "next";
import { LotCard } from "@/components/LotCard";
import { pastOf } from "@/lib/lots";
import { getCatalog } from "@/lib/server/catalog";
import { currentUser } from "@/lib/server/auth";
import { toPublicAll } from "@/lib/server/public-lots";
import { accessOpen, getTariffs } from "@/lib/server/settings";

export const metadata: Metadata = {
  title: "Прошедшие торги и реальные цены выкупа",
  description: "За сколько реально выкупаются автомобили на аукционах Copart, IAAI и Manheim: архив лотов из нашей подборки.",
};

export const dynamic = "force-dynamic";

export default async function SoldPage() {
  const lots = toPublicAll(pastOf((await getCatalog()).lots), (await currentUser()) ?? (await accessOpen()), await getTariffs());
  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-h">
          <div><div className="eyebrow">Архив подборки</div><h1 style={{ fontSize: "clamp(24px,3.4vw,34px)" }}>Прошедшие торги</h1></div>
          <p className="note" style={{ margin: 0, maxWidth: "52ch" }}>После торгов система записывает реальную цену выкупа. Если аукцион её не раскрыл, лот помечается «Торги завершены».</p>
        </div>
        <div className="grid">{lots.map((l) => <LotCard key={l.id} lot={l} />)}</div>
      </div>
    </section>
  );
}
