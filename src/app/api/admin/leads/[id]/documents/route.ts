import { api, idParam } from "@/lib/server/api";
import { AuthError } from "@/lib/server/auth";
import { requireStaff } from "@/lib/server/guard";
import { saveDocument } from "@/lib/server/billing";
import { getLead } from "@/lib/server/leads";

/** Загрузка документа к заявке (multipart: file, name). */
export const POST = api(async (req, ctx) => {
  const user = await requireStaff();
  const id = await idParam(ctx);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new AuthError("Выберите файл");
  await saveDocument(user, id, file, String(form?.get("name") || ""));
  return getLead(id);
});
