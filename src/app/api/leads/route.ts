import { api, body } from "@/lib/server/api";
import { AuthError, clientInfo, currentUser } from "@/lib/server/auth";
import { normalizePhone } from "@/lib/server/otp";
import { accessOpen } from "@/lib/server/settings";
import { createLead, myLeads, type NewLead } from "@/lib/server/leads";
import type { Country } from "@/lib/types";

/** Заявки клиента: создать («Хочу эту машину», подбор, точный расчёт) и посмотреть свои. */
// Гостевые заявки (открытый доступ): не больше 6 в час с одного IP
const guestHits = new Map<string, number[]>();
function guestLimit(ip: string) {
  const now = Date.now();
  const list = (guestHits.get(ip) || []).filter((t) => now - t < 3_600_000);
  if (list.length >= 6) throw new AuthError("Слишком много заявок за час. Позвоните нам — ответим сразу.", 429);
  list.push(now); guestHits.set(ip, list);
  if (guestHits.size > 5000) guestHits.clear();
}

export const POST = api(async (req) => {
  const user = await currentUser();
  const b = await body<NewLead & { country?: Country; name?: string; phone?: string }>(req);
  if (!user) {
    if (!(await accessOpen())) throw new AuthError("Войдите, чтобы оставить заявку", 401);
    const phone = normalizePhone(String(b.phone || ""));
    if (!phone) throw new AuthError("Укажите телефон в формате +375 29 123-45-67 или +7 916 123-45-67");
    const name = String(b.name || "").trim().replace(/\s+/g, " ").slice(0, 60);
    if (name.length < 2) throw new AuthError("Укажите, как к вам обращаться");
    guestLimit((await clientInfo()).ip || "?");
    const country: Country = b.country === "ru" ? "ru" : "by";
    const { lead, existing } = await createLead({ id: null, name, phone }, country, b);
    return { id: lead.id, existing };
  }
  const country: Country = b.country === "ru" ? "ru" : b.country === "by" ? "by" : user.country;
  const { lead, existing } = await createLead(user, country, b);
  return { id: lead.id, existing };
});

export const GET = api(async () => {
  const user = await currentUser();
  if (!user) throw new AuthError("Нужно войти", 401);
  return { leads: await myLeads(user.id) };
});
