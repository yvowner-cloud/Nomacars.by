/**
 * Фото с аукционов часто приходят в виде маленьких превью. Здесь — адрес той же картинки в большом размере.
 * Если большой вариант не откроется, LotImage вернётся к исходному адресу, так что замена безопасна.
 */
export function hiRes(url: string): string {
  let u = String(url || "");
  try {
    const p = new URL(u);
    const host = p.hostname.toLowerCase();
    // Copart: …_thb.jpg / …_tmb.jpg (превью) → …_ful.jpg (полный размер)
    if (host.endsWith("copart.com")) {
      u = u.replace(/_(thb|tmb|thn)\.(jpe?g|png|webp)(\?|$)/i, "_ful.$2$3");
      return u;
    }
    // IAAI: resizer?imageKeys=…&width=161&height=120 → крупный размер
    if (host.endsWith("iaai.com") && /resizer/i.test(p.pathname)) {
      const w = Number(p.searchParams.get("width") || 0);
      if (w && w < 800) { p.searchParams.set("width", "1024"); p.searchParams.set("height", "768"); }
      return p.toString();
    }
    // Manheim: …?size=w86h64 → w1024h768
    if (host.includes("manheim")) {
      const s = p.searchParams.get("size");
      if (s && /^w\d+h\d+$/i.test(s)) { p.searchParams.set("size", "w1024h768"); return p.toString(); }
    }
  } catch { /* не URL — оставляем как есть */ }
  return u;
}

/** Фото через наш сервер (/api/photo) — аукционы не отдают картинки напрямую на чужой сайт. */
export const viaServer = (url: string) => `/api/photo?u=${encodeURIComponent(url)}`;

/**
 * Порядок попыток для фото №index: через наш сервер в большом размере, через сервер исходный адрес,
 * напрямую с аукциона; затем то же для остальных фото лота.
 */
export function photoCandidates(photos: string[] | undefined, index = 0, fallbackToOthers = true): string[] {
  const list = (photos || []).filter(Boolean);
  if (!list.length) return [];
  const order = [list[index] ?? list[0], ...(fallbackToOthers ? list.filter((_, i) => i !== index) : [])];
  const out: string[] = [];
  for (const src of order) {
    const big = hiRes(src);
    for (const u of [viaServer(big), viaServer(src), src]) if (!out.includes(u)) out.push(u);
  }
  return out.slice(0, 9);
}
