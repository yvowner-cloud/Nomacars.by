import type { UsState } from "./types";

export const US_STATES: Record<UsState, { name: string; port: string }> = {
  NJ: { name: "Нью-Джерси", port: "Ньюарк" },
  GA: { name: "Джорджия", port: "Саванна" },
  TX: { name: "Техас", port: "Хьюстон" },
  FL: { name: "Флорида", port: "Джексонвилл" },
  CA: { name: "Калифорния", port: "Лос-Анджелес" },
  IL: { name: "Иллинойс", port: "Ньюарк (ж/д)" },
};
