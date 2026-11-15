import { api } from "@/lib/server/api";
import { logout } from "@/lib/server/auth";

export const POST = api(async () => { await logout(); return { ok: true }; });
