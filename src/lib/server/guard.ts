import { AuthError, currentUser, type User } from "./auth";

/** Только владелец (тарифы, настройки). */
export async function requireOwner(): Promise<User> {
  const u = await currentUser();
  if (!u) throw new AuthError("Нужно войти", 401);
  if (u.role !== "owner") throw new AuthError("Доступно только владельцу", 403);
  return u;
}

/** Владелец или менеджер (заявки, клиенты). */
export async function requireStaff(): Promise<User> {
  const u = await currentUser();
  if (!u) throw new AuthError("Нужно войти", 401);
  if (u.role !== "owner" && u.role !== "manager") throw new AuthError("Доступно только сотрудникам", 403);
  return u;
}
