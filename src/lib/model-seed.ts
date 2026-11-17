/**
 * Черновой список моделей (уровни спроса). Владелец правит его в кабинете → «Модели».
 * A — хиты (цель 6), B — ходовые (4), C — полнота линейки (2). Модели 2022–2024 годов на рынке США.
 */
export const TIER_TARGET = { A: 6, B: 4, C: 2 } as const;
export type Tier = keyof typeof TIER_TARGET;

const L = (make: string, tiers: Partial<Record<Tier, string[]>>) =>
  (Object.entries(tiers) as [Tier, string[]][]).flatMap(([tier, models]) => models.map((model) => ({ make, model, tier })));

export const MODEL_SEED: { make: string; model: string; tier: Tier }[] = [
  ...L("Toyota", { A: ["RAV4", "Camry"], B: ["Corolla", "Highlander", "Corolla Cross"], C: ["Venza", "4Runner", "Prius", "Crown"] }),
  ...L("Lexus", { A: ["RX"], B: ["NX", "ES"], C: ["IS", "UX", "GX", "RC", "LC"] }),
  ...L("Honda", { A: ["CR-V"], B: ["Accord", "Civic"], C: ["HR-V", "Pilot", "Passport"] }),
  ...L("Acura", { C: ["RDX", "MDX", "TLX"] }),
  ...L("Hyundai", { A: ["Tucson"], B: ["Santa Fe", "Elantra", "Sonata"], C: ["Kona", "Palisade", "Ioniq 5", "Santa Cruz"] }),
  ...L("Kia", { A: ["Sportage"], B: ["Sorento", "K5"], C: ["Seltos", "Telluride", "Forte", "EV6", "Niro"] }),
  ...L("Genesis", { B: ["GV70"], C: ["G70", "G80", "GV80"] }),
  ...L("Mazda", { A: ["CX-5"], B: ["CX-30", "Mazda3"], C: ["CX-50", "CX-9", "CX-90", "MX-5 Miata"] }),
  ...L("Nissan", { B: ["Rogue", "Altima"], C: ["Sentra", "Murano", "Pathfinder", "Kicks"] }),
  ...L("Infiniti", { C: ["QX50", "QX60", "Q50"] }),
  ...L("Subaru", { B: ["Forester", "Outback"], C: ["Crosstrek", "Ascent", "Impreza", "WRX"] }),
  ...L("Volkswagen", { B: ["Tiguan", "Jetta"], C: ["Atlas", "Atlas Cross Sport", "Taos", "Passat", "ID.4", "Arteon"] }),
  ...L("Chevrolet", { B: ["Equinox"], C: ["Malibu", "Blazer", "Traverse", "Trax", "Trailblazer", "Camaro", "Corvette"] }),
  ...L("Ford", { B: ["Escape"], C: ["Edge", "Explorer", "Bronco Sport", "Mustang Mach-E", "Mustang"] }),
  ...L("Jeep", { C: ["Compass", "Cherokee", "Grand Cherokee", "Wrangler"] }),
  ...L("Tesla", { A: ["Model Y"], B: ["Model 3"], C: ["Model S", "Model X"] }),
  ...L("BMW", { A: ["X5", "X3"], B: ["X1", "X4", "3 Series", "5 Series"], C: ["X2", "X6", "X7", "2 Series", "4 Series", "7 Series", "8 Series", "i4", "iX", "Z4"] }),
  ...L("Mercedes-Benz", { A: ["GLC"], B: ["GLE", "C-Class", "E-Class"], C: ["GLA", "GLB", "GLS", "CLA", "S-Class", "G-Class", "EQE", "AMG GT"] }),
  ...L("Audi", { A: ["Q5"], B: ["Q7", "A4"], C: ["Q3", "Q8", "A5", "A6", "A7", "e-tron", "TT"] }),
  ...L("Volvo", { B: ["XC60", "XC90"], C: ["XC40", "S60", "S90", "V60"] }),
  ...L("Porsche", { C: ["Macan", "Cayenne", "Panamera", "911", "Taycan"] }),
  ...L("Land Rover", { C: ["Range Rover Sport", "Range Rover Velar", "Range Rover Evoque", "Range Rover", "Discovery Sport", "Defender"] }),
];

/** Премиум-марки: у них разрешены купе и кабриолеты (решение владельца). */
export const PREMIUM_MAKES = ["BMW", "Mercedes-Benz", "Audi", "Porsche", "Lexus", "Genesis", "Land Rover", "Volvo", "Tesla", "Infiniti", "Acura"];
