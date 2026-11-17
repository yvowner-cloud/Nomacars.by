import { api, body, idParam } from "@/lib/server/api";
import { AuthError } from "@/lib/server/auth";
import { requireOwner } from "@/lib/server/guard";
import { deleteModel, modelsWithCoverage, updateModel } from "@/lib/server/models";

export const PATCH = api(async (req, ctx) => {
  await requireOwner();
  try { await updateModel(await idParam(ctx), await body(req)); } catch (e) { throw new AuthError((e as Error).message); }
  return modelsWithCoverage();
});

export const DELETE = api(async (_req, ctx) => {
  await requireOwner();
  await deleteModel(await idParam(ctx));
  return modelsWithCoverage();
});
