export const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");
export const money = (n: number) => `$ ${fmt(n)}`;
export const toKm = (miles: number) => Math.round((miles * 1.609) / 100) * 100;
export const kmStr = (miles: number) => `${fmt(toKm(miles))} км`;
export const dateShort = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
export const dateLong = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
/** Двигатель для карточки. Оценочную мощность (нет на аукционе) не показываем. */
export const engineStr = (cc: number, hp: number, hpEstimated?: boolean) =>
  [cc ? `${(cc / 1000).toFixed(1)} л` : "электро", hpEstimated ? null : `${hp} л.с.`].filter(Boolean).join(" · ");
