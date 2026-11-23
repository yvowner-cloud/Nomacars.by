import { getPhoto, PhotoError } from "@/lib/server/photo-proxy";

export const runtime = "nodejs";

/** /api/photo?u=<адрес фото на аукционе> — фото лота через наш сервер (с кешем на диске). */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u") || "";
  try {
    const { data, type } = await getPhoto(u);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (e) {
    const status = e instanceof PhotoError ? e.status : 500;
    if (status >= 500) console.error("[photo]", (e as Error).message, u.slice(0, 200));
    return new Response(null, { status, headers: { "Cache-Control": "public, max-age=600" } });
  }
}
