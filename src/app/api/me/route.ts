import { api, body } from "@/lib/server/api";
import { AuthError, currentUser, updateProfile } from "@/lib/server/auth";
import type { Country } from "@/lib/types";

export const GET = api(async () => ({ user: await currentUser() }));

export const PATCH = api(async (req) => {
  const user = await currentUser();
  if (!user) throw new AuthError("Нужно войти", 401);
  const b = await body<{ name?: string; country?: Country }>(req);
  await updateProfile(user.id, b);
  return { ok: true };
});
