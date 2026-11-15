import { api, body, idParam } from "@/lib/server/api";
import { requireStaff } from "@/lib/server/guard";
import { addInvoice, invoicesFromCalc } from "@/lib/server/billing";
import { getLead } from "@/lib/server/leads";

/** Выставить счёт: { title, amount } или { fromCalc: true } — 4 счёта по расчёту. */
export const POST = api(async (req, ctx) => {
  const user = await requireStaff();
  const id = await idParam(ctx);
  const b = await body<{ title?: string; amount?: unknown; fromCalc?: boolean }>(req);
  if (b.fromCalc) await invoicesFromCalc(user, id);
  else await addInvoice(user, id, String(b.title || ""), b.amount);
  return getLead(id);
});
