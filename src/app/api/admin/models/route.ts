import { api, body } from "@/lib/server/api";
import { AuthError } from "@/lib/server/auth";
import { requireOwner, requireStaff } from "@/lib/server/guard";
import { bulkUpsert, modelsWithCoverage, upsertModel } from "@/lib/server/models";

export const GET = api(async () => { await requireStaff(); return modelsWithCoverage(); });

/** { make, model, tier?, target? } — одна модель; { bulk: "строки" } — массово. */
export const POST = api(async (req) => {
  await requireOwner();
  const b = await body<{ make?: string; model?: string; tier?: string; target?: unknown; bulk?: string }>(req);
  try {
    if (b.bulk !== undefined) {
      const r = await bulkUpsert(b.bulk);
      return { ...r, ...(await modelsWithCoverage()) };
    }
    await upsertModel(b);
    return modelsWithCoverage();
  } catch (e) { throw new AuthError((e as Error).message); }
});
