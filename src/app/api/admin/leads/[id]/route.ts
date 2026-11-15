import { api, body, idParam } from "@/lib/server/api";
import { requireStaff } from "@/lib/server/guard";
import { getLead, updateLead } from "@/lib/server/leads";

export const GET = api(async (_req, ctx) => { await requireStaff(); return getLead(await idParam(ctx)); });

export const PATCH = api(async (req, ctx) => {
  const user = await requireStaff();
  const b = await body<{ status?: string; notes?: string }>(req);
  return updateLead(await idParam(ctx), user, b);
});
