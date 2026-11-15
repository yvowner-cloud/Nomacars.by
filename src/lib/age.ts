import { DAY } from "./time";

/** Возраст авто (лет) на ожидаемую дату растаможки. */
export function ageAtCustoms(year: number, month: number, saleDate: Date, deliveryDays: number): number {
  const prod = new Date(year, month - 1, 1).getTime();
  const customs = saleDate.getTime() + deliveryDays * DAY;
  return (customs - prod) / (365.25 * DAY);
}

/** «Проходной» = 3–5 лет на дату растаможки. */
export const isPassable = (age: number, min = 3, max = 5) => age >= min && age <= max;

/** Срок от торгов до растаможки по умолчанию, дней (демо; на этапе 3 — из настроек). */
export const DELIVERY_DAYS = 75;
