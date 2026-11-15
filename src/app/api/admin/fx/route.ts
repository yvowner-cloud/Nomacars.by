import { api } from "@/lib/server/api";
import { requireOwner } from "@/lib/server/guard";
import { effectiveRates, refreshFx } from "@/lib/server/settings";

/** Обновить курсы с НБРБ и ЦБ РФ прямо сейчас. */
export const POST = api(async () => {
  await requireOwner();
  const fx = await refreshFx();
  return { fx, rates: effectiveRates(fx) };
});
