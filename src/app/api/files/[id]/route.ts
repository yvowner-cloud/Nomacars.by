import { api, idParam } from "@/lib/server/api";
import { AuthError, currentUser } from "@/lib/server/auth";
import { readDocument } from "@/lib/server/billing";

/** Скачать документ: только клиент — владелец заявки — и сотрудники. */
export const GET = api(async (req, ctx) => {
  const user = await currentUser();
  if (!user) throw new AuthError("Нужно войти", 401);
  const { doc, data } = await readDocument(user, await idParam(ctx));
  const inline = new URL(req.url).searchParams.has("view") && (doc.mime.startsWith("image/") || doc.mime === "application/pdf");
  const ext = doc.mime === "application/pdf" ? ".pdf" : "";
  const fname = encodeURIComponent(doc.name.endsWith(ext) ? doc.name : doc.name + ext);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Length": String(data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${fname}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
