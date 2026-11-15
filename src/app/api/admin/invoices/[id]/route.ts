import { api, body, idParam } from "@/lib/server/api";
import { requireStaff } from "@/lib/server/guard";
import { deleteInvoice, setInvoicePaid } from "@/lib/server/billing";

export const PATCH = api(async (req, ctx) => {
  const user = await requireStaff();
  const { paid } = await body<{ paid?: boolean }>(req);
  await setInvoicePaid(user, await idParam(ctx), Boolean(paid));
  return { ok: true };
});

export const DELETE = api(async (_req, ctx) => {
  const user = await requireStaff();
  await deleteInvoice(user, await idParam(ctx));
  return { ok: true };
});
