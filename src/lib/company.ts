/**
 * Данные компании. ЗАГЛУШКИ — заменить на реальные.
 * На этапе 3 переезжают в «Настройки компании» в кабинете владельца.
 */
export const COMPANY = {
  brand: "Ncars",
  domain: "ncars.by",
  phone: "+375 (29) 629-20-00",
  /** Номер для ссылок tel:, WhatsApp, Viber, Telegram — только цифры с плюсом. */
  phoneE164: "+375296292000",
  telegram: "+375 29 629-20-00",
  whatsapp: "+375 29 629-20-00",
  office: "Минск, ул. Богдановича, 149А, офис 25-3",
  officeFull: "220040, Беларусь, г. Минск, ул. Богдановича, д. 149А, оф. 25-3",
  officeMap: "https://yandex.by/maps/?text=" + encodeURIComponent("Минск, улица Богдановича, 149А"),
  hours: "Пн–Пт 9:00–19:00, Сб 10:00–16:00",
  serviceFee: 700,
};

/** Ссылки для связи: звонок, WhatsApp, Viber, Telegram (по номеру телефона). */
export const CONTACT_LINKS = {
  tel: `tel:${COMPANY.phoneE164}`,
  whatsapp: `https://wa.me/${COMPANY.phoneE164.replace(/\D/g, "")}`,
  viber: `viber://chat?number=%2B${COMPANY.phoneE164.replace(/\D/g, "")}`,
  telegram: `https://t.me/${COMPANY.phoneE164}`,
  instagram: "https://www.instagram.com/ncars.by/",
};
