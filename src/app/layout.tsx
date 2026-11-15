import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { COMPANY } from "@/lib/company";
import { upcomingFrom } from "@/lib/lots";
import { getCatalog } from "@/lib/server/catalog";
import { currentUser, favoriteIds } from "@/lib/server/auth";
import { newLeadsCount } from "@/lib/server/leads";
import { unseenCount } from "@/lib/server/billing";

export const dynamic = "force-dynamic"; // демо: даты торгов считаются от «сегодня»

export const metadata: Metadata = {
  metadataBase: new URL(`https://${COMPANY.domain}`),
  title: { default: `${COMPANY.brand}: авто из США под ключ в Беларусь и Россию`, template: `%s · ${COMPANY.brand}` },
  description: "Проходные автомобили 3–5 лет с аукционов Copart и IAAI. Еженедельная подборка, калькулятор под ключ, доставка и растаможка в РБ и РФ.",
  openGraph: { type: "website", locale: "ru_RU", siteName: COMPANY.brand },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#000000" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const favorites = user ? await favoriteIds(user.id).catch(() => []) : [];
  const staff = user && (user.role === "owner" || user.role === "manager");
  const newLeads = staff ? await newLeadsCount().catch(() => 0) : 0;
  const unseen = user && !staff ? await unseenCount(user.id).catch(() => 0) : 0;
  const upcoming = upcomingFrom((await getCatalog()).lots).map((u) => ({ iso: u.date.toISOString(), auction: u.auction, count: u.count }));
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Roboto+Mono:wght@500&display=swap" />
      </head>
      <body>
        <Providers initialUser={user} initialFavorites={favorites}>
          <Header upcoming={upcoming} newLeads={newLeads} unseen={unseen} />
          <main>{children}</main>
          <Footer upcoming={upcoming} />
        </Providers>
      </body>
    </html>
  );
}
