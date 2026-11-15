import { api, body } from "@/lib/server/api";
import { favoriteIds, verifyLoginCode } from "@/lib/server/auth";
import type { Country } from "@/lib/types";

export const POST = api(async (req) => {
  const b = await body<{ phone?: string; code?: string; name?: string; country?: Country }>(req);
  const user = await verifyLoginCode(String(b.phone || ""), String(b.code || "").trim(), b.name, b.country);
  return { user, favorites: await favoriteIds(user.id) };
});
