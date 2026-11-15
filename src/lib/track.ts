/** Шкала этапов для клиента: статус заявки → шаг. */
export const TRACK = ["Заявка", "Торги", "Куплена", "В порту США", "В море", "В порту назначения", "На таможне", "Готова к выдаче", "Выдана"] as const;

const STEP: Record<string, number> = {
  new: 0, in_progress: 0, bidding: 1, bought: 2, us_port: 3, ocean: 4, dest_port: 5, customs: 6, ready: 7, delivered: 8,
};

export const trackStep = (status: string) => STEP[status] ?? 0;
