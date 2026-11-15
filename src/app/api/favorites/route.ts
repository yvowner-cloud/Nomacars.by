import { api, body } from "@/lib/server/api";
import { AuthError, currentUser, favoriteIds, setFavorite } from "@/lib/server/auth";
import { LOTS } from "@/lib/lots";

export const GET = api(async () => {
  const user = await currentUser();
  return { favorites: user ? await favoriteIds(user.id) : [] };
});

export const POST = api(async (req) => {
  const user = await currentUser();
  if (!user) throw new AuthError("Нужно войти", 401);
  const { lotId, on } = await body<{ lotId?: number; on?: boolean }>(req);
  if (!LOTS.some((l) => l.id === Number(lotId))) throw new AuthError("Лот не найден", 404);
  await setFavorite(user.id, Number(lotId), Boolean(on));
  return { favorites: await favoriteIds(user.id) };
});
