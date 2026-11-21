import type { VehicleSize } from "./types";
import { normMake, normModel } from "./model-match";

/**
 * Большие SUV для тарифа логиста: «BMW X7 / Audi Q7» (Поти) и «Ford Explorer и схожие» (Клайпеда).
 * Трёхрядные и полноразмерные кроссоверы. Сравнение — по началу названия модели.
 */
const BIG: Record<string, string[]> = {
  bmw: ["x7", "ix"],
  mercedesbenz: ["gls", "gclass", "eqs suv", "maybach gls"],
  audi: ["q7", "q8", "etron"],
  ford: ["explorer", "expedition"],
  chevrolet: ["tahoe", "suburban", "traverse"],
  gmc: ["yukon", "acadia"],
  cadillac: ["escalade", "xt6"],
  lincoln: ["navigator", "aviator"],
  toyota: ["highlander", "grandhighlander", "sequoia", "landcruiser"],
  lexus: ["gx", "lx", "tx"],
  honda: ["pilot"],
  acura: ["mdx"],
  hyundai: ["palisade"],
  kia: ["telluride"],
  genesis: ["gv80"],
  mazda: ["cx9", "cx90"],
  nissan: ["pathfinder", "armada"],
  infiniti: ["qx60", "qx80"],
  subaru: ["ascent"],
  volkswagen: ["atlas"],
  jeep: ["grandcherokeel", "grandwagoneer", "wagoneer"],
  dodge: ["durango"],
  volvo: ["xc90", "ex90"],
  tesla: ["modelx"],
  landrover: ["rangerover", "defender", "discovery"],
  porsche: ["cayenne"],
  rivian: ["r1s"],
};
// Компактные Range Rover и Discovery Sport — обычный SUV
const NOT_BIG = ["rangeroversport", "rangerovervelar", "rangeroverevoque", "discoverysport"];

export function vehicleSize(body: string | undefined, make: string | undefined, model: string | undefined): VehicleSize {
  if (body !== "suv") return "sedan";
  const m = normModel(model || "");
  if (NOT_BIG.some((x) => m.startsWith(x))) return "suv";
  const list = BIG[normMake(make || "")] || [];
  return list.some((x) => m.startsWith(normModel(x))) ? "big" : "suv";
}

export const SIZE_NAME: Record<VehicleSize, string> = { sedan: "седан", suv: "SUV", big: "большой SUV" };
