import { NextResponse } from "next/server";
import { AuthError } from "./auth";

/** Общая обёртка API: защита от запросов с чужих сайтов, понятные ошибки на русском. */
export function api<T>(handler: (req: Request) => Promise<T>) {
  return async (req: Request) => {
    try {
      if (req.method !== "GET") {
        const origin = req.headers.get("origin");
        const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
        if (origin && host && new URL(origin).host !== host) {
          return NextResponse.json({ error: "Запрос с другого сайта отклонён" }, { status: 403 });
        }
      }
      const data = await handler(req);
      return NextResponse.json(data ?? { ok: true });
    } catch (e) {
      if (e instanceof AuthError) {
        const res = NextResponse.json({ error: e.message, retryAfterSec: e.retryAfterSec }, { status: e.status });
        if (e.retryAfterSec) res.headers.set("Retry-After", String(e.retryAfterSec));
        return res;
      }
      console.error("[api]", e);
      return NextResponse.json({ error: "Что-то пошло не так. Попробуйте ещё раз." }, { status: 500 });
    }
  };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { throw new AuthError("Неверный формат запроса"); }
}
