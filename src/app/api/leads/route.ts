import { api, body } from "@/lib/server/api";
import { AuthError, currentUser } from "@/lib/server/auth";
import { createLead, myLeads, type NewLead } from "@/lib/server/leads";
import type { Country } from "@/lib/types";

/** Заявки клиента: создать («Хочу эту машину», подбор, точный расчёт) и посмотреть свои. */
export const POST = api(async (req) => {
  const user = await currentUser();
  if (!user) throw new AuthError("Войдите, чтобы оставить заявку", 401);
  const b = await body<NewLead & { country?: Country }>(req);
  const country: Country = b.country === "ru" ? "ru" : b.country === "by" ? "by" : user.country;
  const { lead, existing } = await createLead(user, country, b);
  return { id: lead.id, existing };
});

export const GET = api(async () => {
  const user = await currentUser();
  if (!user) throw new AuthError("Нужно войти", 401);
  return { leads: await myLeads(user.id) };
});
