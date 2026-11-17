import { api, idParam } from "@/lib/server/api";
import { AuthError } from "@/lib/server/auth";
import { requireStaff } from "@/lib/server/guard";
import { q1 } from "@/lib/server/db";
import type { ImportCheck } from "@/lib/lot-import";

/** Скачать подборку: проверенные лоты в едином формате + замечания проверки. ?raw — исходный текст. */
export const GET = api(async (req, ctx) => {
  await requireStaff();
  const id = await idParam(ctx);
  const row = await q1<{ payload: { raw?: string }; checked: ImportCheck; created_at: string }>(
    "select payload, checked, created_at from lot_imports where id=$1", [id]);
  if (!row) throw new AuthError("Подборка не найдена", 404);
  const raw = new URL(req.url).searchParams.has("raw");
  const c = row.checked;
  const body = raw ? row.payload.raw ?? "" : JSON.stringify({
    source: c.source, collected_at: c.collectedAt, notes: c.notes, criteria_version: 1, import_id: id,
    lots: c.lots.filter((l) => l.lot).map((l) => ({ ...l.lot, _warnings: l.warnings })),
    rejected: c.lots.filter((l) => !l.lot).map((l) => ({ index: l.index, key: l.key, errors: l.errors })),
  }, null, 2);
  const date = new Date(row.created_at).toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": raw ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ncars-lots-${date}-${id}${raw ? "-raw.txt" : ".json"}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
