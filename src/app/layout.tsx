import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${COMPANY.domain}`),
  title: { default: `${COMPANY.brand}: авто из США под ключ в Беларусь и Россию`, template: `%s · ${COMPANY.brand}` },
  description: "Проходные автомобили 3–5 лет с аукционов Copart и IAAI. Еженедельная подборка, калькулятор под ключ, доставка и растаможка в РБ и РФ.",
  openGraph: { type: "website", locale: "ru_RU", siteName: COMPANY.brand },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#c8102e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@500&display=swap" />
      </head>
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
