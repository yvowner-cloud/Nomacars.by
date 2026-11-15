import { api } from "@/lib/server/api";
import { AuthError } from "@/lib/server/auth";
import { requireOwner, requireStaff } from "@/lib/server/guard";
import { q, q1 } from "@/lib/server/db";
import { checkImport } from "@/lib/lot-import";

/** Загруженные подборки лотов: список и загрузка новой (JSON в теле запроса). */
export const GET = api(async () => {
  await requireStaff();
  const rows = await q(`select i.id::int, i.source, i.notes, i.collected_at, i.total, i.valid, i.created_at, coalesce(nullif(u.name,''), u.phone) as who
    from lot_imports i left join users u on u.id = i.created_by order by i.created_at desc limit 30`);
  return { imports: rows };
});

export const POST = api(async (req) => {
  const user = await requireOwner();
  const text = await req.text();
  if (text.length > 5_000_000) throw new AuthError("Файл слишком большой (больше 5 МБ)");
  const check = checkImport(text);
  if (!check.ok) throw new AuthError(check.fatal || "Подборка не прошла проверку", 422);
  const payload = { raw: text };
  const row = await q1<{ id: number }>(
    `insert into lot_imports (source, notes, collected_at, total, valid, payload, checked, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning id::int`,
    [check.source, check.notes, check.collectedAt, check.lots.length, check.valid, JSON.stringify(payload), JSON.stringify(check), user.id]);
  return { id: row!.id, total: check.lots.length, valid: check.valid };
});
