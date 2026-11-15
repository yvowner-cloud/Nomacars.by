import { api } from "@/lib/server/api";
import { requireStaff } from "@/lib/server/guard";
import { adminLots } from "@/lib/server/catalog";

export const GET = api(async () => { await requireStaff(); return { lots: await adminLots() }; });
