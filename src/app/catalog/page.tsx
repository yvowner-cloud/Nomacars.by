import type { Metadata } from "next";
import { CatalogView, type Initial } from "@/components/CatalogView";
import { activeOf } from "@/lib/lots";
import { getCatalog } from "@/lib/server/catalog";
import { currentUser } from "@/lib/server/auth";
import { toPublicAll } from "@/lib/server/public-lots";
import { accessOpen, getTariffs } from "@/lib/server/settings";

export const metadata: Metadata = {
  title: "Каталог лотов Copart, IAAI и Manheim",
  description: "Еженедельная подборка Ncars: проходные автомобилей 3–5 лет с аукционов США с минимальными повреждениями.",
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const initial: Initial = { q: sp.q, make: sp.make, body: sp.body, fuel: sp.fuel, auction: sp.auction, top: sp.top, watch: sp.watch, sort: sp.sort };
  const key = JSON.stringify(initial); // пересоздать фильтры при переходе по ссылке из меню
  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-h">
          <div><div className="eyebrow">Подборка Ncars · обновляется еженедельно</div><h1 style={{ fontSize: "clamp(24px,3.4vw,34px)" }}>Каталог лотов Copart, IAAI и Manheim</h1></div>
        </div>
        <CatalogView key={key} lots={toPublicAll(activeOf((await getCatalog()).lots), (await currentUser()) ?? (await accessOpen()), await getTariffs())} initial={initial} />
      </div>
    </section>
  );
}
