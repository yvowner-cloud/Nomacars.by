import { NextResponse } from "next/server";
import { AuthError } from "./auth";

/** Общая обёртка API: защита от запросов с чужих сайтов, понятные ошибки на русском. */
export type Ctx = { params: Promise<Record<string, string>> };

export function api<T>(handler: (req: Request, ctx: Ctx) => Promise<T>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      if (req.method !== "GET") {
        const origin = req.headers.get("origin");
        const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
        if (origin && host && new URL(origin).host !== host) {
          return NextResponse.json({ error: "Запрос с другого сайта отклонён" }, { status: 403 });
        }
      }
      const data = await handler(req, ctx);
      if (data instanceof Response) return data;
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

/** Числовой id из параметров маршрута. */
export async function idParam(ctx: Ctx, name = "id"): Promise<number> {
  const v = Number((await ctx.params)[name]);
  if (!Number.isInteger(v) || v <= 0) throw new AuthError("Неверный номер", 404);
  return v;
}
