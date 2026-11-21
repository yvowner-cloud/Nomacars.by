import { api, body } from "@/lib/server/api";
import { requireOwner } from "@/lib/server/guard";
import { accessOpen, setAccessOpen } from "@/lib/server/settings";

/** Открытый доступ (цены и заявки без входа): включает и выключает только владелец. */
export const POST = api(async (req) => {
  const owner = await requireOwner();
  const b = await body<{ open?: boolean }>(req);
  await setAccessOpen(Boolean(b.open), owner.id);
  return { open: await accessOpen() };
});
