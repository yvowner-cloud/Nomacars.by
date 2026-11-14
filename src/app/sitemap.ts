import type { MetadataRoute } from "next";
import { LOTS } from "@/lib/lots";
import { COMPANY } from "@/lib/company";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${COMPANY.domain}`;
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/catalog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/sold`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/calc`, changeFrequency: "monthly", priority: 0.7 },
    ...LOTS.map((l) => ({ url: `${base}/lot/${l.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
