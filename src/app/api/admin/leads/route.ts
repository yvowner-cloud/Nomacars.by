import { api } from "@/lib/server/api";
import { requireStaff } from "@/lib/server/guard";
import { listLeads } from "@/lib/server/leads";

export const GET = api(async (req) => {
  await requireStaff();
  const u = new URL(req.url);
  return listLeads({ status: u.searchParams.get("status") || undefined, q: u.searchParams.get("q") || undefined });
});
