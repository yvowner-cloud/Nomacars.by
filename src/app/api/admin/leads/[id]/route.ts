import { api, body } from "@/lib/server/api";
import { requireStaff } from "@/lib/server/guard";
import { getLead, updateLead } from "@/lib/server/leads";

const idOf = (req: Request) => Number(new URL(req.url).pathname.split("/").pop());

export const GET = api(async (req) => { await requireStaff(); return getLead(idOf(req)); });

export const PATCH = api(async (req) => {
  const user = await requireStaff();
  const b = await body<{ status?: string; notes?: string }>(req);
  return updateLead(idOf(req), user, b);
});
