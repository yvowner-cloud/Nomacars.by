/** Статусы заявки — общие для кабинета владельца и (на этапе 5) кабинета клиента. */
export const LEAD_STATUSES = [
  { key: "new", label: "Новая", client: "Заявка принята" },
  { key: "in_progress", label: "В работе", client: "Менеджер проверяет лот" },
  { key: "bidding", label: "Торги", client: "Торги" },
  { key: "bought", label: "Куплена", client: "Куплена" },
  { key: "us_port", label: "В порту США", client: "В порту США" },
  { key: "ocean", label: "В море", client: "В море" },
  { key: "dest_port", label: "В порту назначения", client: "В порту назначения" },
  { key: "customs", label: "На таможне", client: "На таможне" },
  { key: "ready", label: "Готова к выдаче", client: "Готова к выдаче" },
  { key: "delivered", label: "Выдана", client: "Выдана" },
  { key: "rejected", label: "Отказ", client: "Заявка закрыта" },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]["key"];
export const isLeadStatus = (s: string): s is LeadStatus => LEAD_STATUSES.some((x) => x.key === s);
export const statusLabel = (s: string) => LEAD_STATUSES.find((x) => x.key === s)?.label ?? s;
export const CLOSED: LeadStatus[] = ["delivered", "rejected"];

export const KIND_LABEL = { lot: "Лот", pick: "Подбор", calc: "Расчёт" } as const;
