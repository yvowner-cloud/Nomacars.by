import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/server/catalog";
import { COMPANY } from "@/lib/company";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { lots } = await getCatalog();
  const base = `https://${COMPANY.domain}`;
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/catalog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/sold`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/calc`, changeFrequency: "monthly", priority: 0.7 },
    ...lots.map((l) => ({ url: `${base}/lot/${l.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
