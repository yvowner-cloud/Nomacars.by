import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Фото лотов через наш сервер. Аукционы не отдают картинки, когда их показывают на чужом сайте,
 * поэтому сервер скачивает фото сам (как обычный браузер со страницы аукциона), хранит копию
 * в UPLOADS_DIR/photo-cache и отдаёт её посетителю. Скачиваются только картинки с сайтов аукционов
 * и логистов из списка ниже — произвольные адреса не принимаются.
 */
const ALLOWED: { suffix: string; referer: string }[] = [
  { suffix: "copart.com", referer: "https://www.copart.com/" },
  { suffix: "iaai.com", referer: "https://www.iaai.com/" },
  { suffix: "manheim.com", referer: "https://www.manheim.com/" },
  { suffix: "ove.com", referer: "https://www.ove.com/" },
  { suffix: "auctionbidder24.com", referer: "https://auctionbidder24.com/" },
  { suffix: "iaai24.com", referer: "https://iaai24.com/" },
  { suffix: "liontrans.group", referer: "https://partners.liontrans.group/" },
];
const MAX_BYTES = 8 * 1024 * 1024;
const CACHE_LIMIT = 1.2 * 1024 * 1024 * 1024; // 1,2 ГБ — потом удаляются самые старые фото
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export class PhotoError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

const dir = () => path.join(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"), "photo-cache");

/** Разрешён ли адрес для скачивания; возвращает Referer страницы аукциона. */
export function allowedPhoto(raw: string): { url: URL; referer: string } | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
  const host = u.hostname.toLowerCase();
  const rule = ALLOWED.find((r) => host === r.suffix || host.endsWith("." + r.suffix));
  return rule ? { url: u, referer: rule.referer } : null;
}

let writes = 0;
async function prune() {
  const d = dir();
  const files = await fs.readdir(d).catch(() => [] as string[]);
  const stats = (await Promise.all(files.filter((f) => f.endsWith(".img")).map(async (f) => {
    const st = await fs.stat(path.join(d, f)).catch(() => null);
    return st ? { f, size: st.size, t: st.mtimeMs } : null;
  }))).filter((x): x is { f: string; size: number; t: number } => Boolean(x)).sort((a, b) => a.t - b.t);
  let total = stats.reduce((s, x) => s + x.size, 0);
  for (const x of stats) {
    if (total <= CACHE_LIMIT * 0.8) break;
    await fs.rm(path.join(d, x.f), { force: true });
    await fs.rm(path.join(d, x.f.replace(/\.img$/, ".type")), { force: true });
    total -= x.size;
  }
}

const inflight = new Map<string, Promise<{ data: Buffer; type: string }>>();

/** Фото из кеша или с аукциона. */
export async function getPhoto(raw: string): Promise<{ data: Buffer; type: string }> {
  const ok = allowedPhoto(raw);
  if (!ok) throw new PhotoError("Адрес фото не с сайта аукциона");
  const key = createHash("sha256").update(ok.url.toString()).digest("hex");
  const file = path.join(dir(), `${key}.img`);
  const cached = await fs.readFile(file).catch(() => null);
  if (cached) {
    const type = await fs.readFile(file.replace(/\.img$/, ".type"), "utf8").catch(() => "image/jpeg");
    void fs.utimes(file, new Date(), new Date()).catch(() => {});
    return { data: cached, type };
  }
  const busy = inflight.get(key);
  if (busy) return busy;
  const p = (async () => {
    const res = await fetch(ok.url, {
      headers: { "User-Agent": UA, Referer: ok.referer, Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
      redirect: "follow", signal: AbortSignal.timeout(12_000),
    }).catch((e) => { throw new PhotoError(`Аукцион не ответил: ${(e as Error).message}`, 502); });
    if (!res.ok) throw new PhotoError(`Аукцион ответил ${res.status}`, 502);
    if (res.url && !allowedPhoto(res.url)) throw new PhotoError("Фото перенаправлено на посторонний сайт", 502);
    const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(type)) throw new PhotoError("По адресу не картинка", 502);
    const len = Number(res.headers.get("content-length") || 0);
    if (len > MAX_BYTES) throw new PhotoError("Фото слишком большое", 502);
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length > MAX_BYTES || data.length < 200) throw new PhotoError("Фото пустое или слишком большое", 502);
    await fs.mkdir(dir(), { recursive: true });
    await fs.writeFile(file, data);
    await fs.writeFile(file.replace(/\.img$/, ".type"), type);
    if (++writes % 200 === 0) void prune().catch(() => {});
    return { data, type };
  })();
  inflight.set(key, p);
  try { return await p; } finally { inflight.delete(key); }
}
