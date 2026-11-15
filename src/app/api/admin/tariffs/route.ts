import { api, body } from "@/lib/server/api";
import { AuthError } from "@/lib/server/auth";
import { requireOwner, requireStaff } from "@/lib/server/guard";
import { editableTariffs, effectiveRates, fxState, history, saveManualRates, saveTariffs, type FxState } from "@/lib/server/settings";
import type { EditableTariffs } from "@/lib/tariff-validate";

async function state() {
  const [tariffs, fx, hist] = await Promise.all([editableTariffs(), fxState(), history()]);
  return { tariffs, fx, rates: effectiveRates(fx), history: hist };
}

export const GET = api(async () => { await requireStaff(); return state(); });

export const PUT = api(async (req) => {
  const user = await requireOwner();
  const b = await body<{ tariffs?: Partial<EditableTariffs>; manualRates?: FxState["manual"] }>(req);
  const errors: string[] = [];
  if (b.tariffs) { const r = await saveTariffs(user.id, b.tariffs); if (!r.ok) errors.push(...r.errors); }
  if (b.manualRates) { const r = await saveManualRates(user.id, b.manualRates); if (!r.ok) errors.push(...r.errors); }
  if (errors.length) throw new AuthError(errors.join("\n"), 422);
  return state();
});
