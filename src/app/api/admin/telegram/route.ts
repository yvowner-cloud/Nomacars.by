import { api, body } from "@/lib/server/api";
import { AuthError } from "@/lib/server/auth";
import { requireOwner, requireStaff } from "@/lib/server/guard";
import { linkedChats, linkFromUpdates, notify, telegramConfigured, unlinkChat } from "@/lib/server/telegram";

export const GET = api(async () => {
  await requireStaff();
  return { configured: telegramConfigured(), chats: await linkedChats() };
});

/** action: link — найти чаты с /start; test — тестовое сообщение; unlink — отвязать чат */
export const POST = api(async (req) => {
  await requireOwner();
  const b = await body<{ action?: string; chatId?: number }>(req);
  try {
    if (b.action === "link") return { configured: true, chats: await linkFromUpdates() };
    if (b.action === "unlink") { await unlinkChat(Number(b.chatId)); return { configured: telegramConfigured(), chats: await linkedChats() }; }
    if (b.action === "test") {
      const ok = await notify(["<b>Ncars</b>: тестовое уведомление. Так будут приходить новые заявки."]);
      if (!ok) throw new Error("Не удалось отправить: проверьте токен бота и привязанные чаты");
      return { ok: true };
    }
  } catch (e) {
    if (e instanceof AuthError) throw e;
    throw new AuthError((e as Error).message, 400);
  }
  throw new AuthError("Неизвестное действие");
});
