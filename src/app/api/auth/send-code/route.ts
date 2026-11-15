import { api, body } from "@/lib/server/api";
import { sendLoginCode } from "@/lib/server/auth";

export const POST = api(async (req) => {
  const { phone } = await body<{ phone?: string }>(req);
  return sendLoginCode(String(phone || ""));
});
