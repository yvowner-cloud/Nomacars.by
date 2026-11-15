import { api, body, idParam } from "@/lib/server/api";
import { AuthError } from "@/lib/server/auth";
import { requireOwner } from "@/lib/server/guard";
import { adminLots, updateLotAdmin } from "@/lib/server/catalog";

/** Тумблер «на сайте», статус лота, цена выкупа — только владелец. */
export const PATCH = api(async (req, ctx) => {
  await requireOwner();
  const id = await idParam(ctx);
  const b = await body<{ visible?: boolean; status?: string; soldPrice?: unknown }>(req);
  try { await updateLotAdmin(id, b); } catch (e) { throw new AuthError((e as Error).message); }
  return { lot: (await adminLots()).find((l) => l.id === id) ?? null };
});
