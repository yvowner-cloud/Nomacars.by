import { api, body } from "@/lib/server/api";
import { requireOwner, requireStaff } from "@/lib/server/guard";
import { getRequisites, saveRequisites, type Requisites } from "@/lib/server/billing";

export const GET = api(async () => { await requireStaff(); return { requisites: await getRequisites() }; });

export const PUT = api(async (req) => {
  const user = await requireOwner();
  return { requisites: await saveRequisites(user, await body<Partial<Requisites>>(req)) };
});
