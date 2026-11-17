/**
 * Сопоставление лота с моделью из списка «Модели».
 * «RAV4 Hybrid» → RAV4, «X5 M» → X5, но «CX-50» → CX-50 (а не CX-5): берётся самое длинное совпадение.
 */
const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9а-яё]/g, "");

const MAKE_ALIASES: Record<string, string> = {
  mercedes: "mercedesbenz", mb: "mercedesbenz", vw: "volkswagen", chevy: "chevrolet",
  rangerover: "landrover", landroverrangerover: "landrover",
};
export const normMake = (m: string) => { const n = norm(m); return MAKE_ALIASES[n] ?? n; };
export const normModel = (m: string) => norm(m);

export interface ModelKey { id: number; make: string; model: string }

/** Вернёт id модели из списка, к которой относится лот, или null. */
export function matchModel<T extends ModelKey>(make: string, model: string, targets: T[]): T | null {
  const mk = normMake(make);
  const md = normModel(model);
  let best: T | null = null;
  for (const t of targets) {
    if (normMake(t.make) !== mk) continue;
    const tm = normModel(t.model);
    if (!tm || !md.startsWith(tm)) continue;
    if (!best || tm.length > normModel(best.model).length) best = t;
  }
  return best;
}
