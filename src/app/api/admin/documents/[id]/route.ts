import { api, idParam } from "@/lib/server/api";
import { requireStaff } from "@/lib/server/guard";
import { deleteDocument } from "@/lib/server/billing";

export const DELETE = api(async (_req, ctx) => {
  const user = await requireStaff();
  await deleteDocument(user, await idParam(ctx));
  return { ok: true };
});
