/**
 * Отправка SMS. Провайдер выбирается в /srv/nomacars/.env:
 *
 *   SMS_PROVIDER=log    — (по умолчанию) SMS не отправляется, код пишется в журнал сайта:
 *                         grep "\[SMS\]" /srv/nomacars/logs/app.log | tail
 *   SMS_PROVIDER=http   — любой SMS-сервис с HTTP API. Настройки:
 *       SMS_HTTP_URL    адрес с подстановками {phone} {phone_digits} {text} {key} {sender}
 *       SMS_HTTP_METHOD GET (по умолчанию) или POST
 *       SMS_HTTP_BODY   тело для POST с теми же подстановками (например JSON)
 *       SMS_HTTP_CONTENT_TYPE  тип тела (по умолчанию application/json)
 *       SMS_API_KEY     ключ сервиса, SMS_SENDER — имя отправителя
 *       SMS_HTTP_OK     (необязательно) слово, которое должно быть в ответе при успехе
 *
 * Когда будет выбран конкретный сервис, для него можно добавить отдельный провайдер.
 */
export type Delivery = "sms" | "log";

export function smsMode(): Delivery {
  return (process.env.SMS_PROVIDER || "log") === "log" ? "log" : "sms";
}

function fill(tpl: string, phone: string, text: string, encode: boolean) {
  const enc = (v: string) => (encode ? encodeURIComponent(v) : v.replace(/"/g, '\\"'));
  return tpl
    .replaceAll("{phone}", enc(phone))
    .replaceAll("{phone_digits}", enc(phone.replace(/\D/g, "")))
    .replaceAll("{text}", enc(text))
    .replaceAll("{key}", enc(process.env.SMS_API_KEY || ""))
    .replaceAll("{sender}", enc(process.env.SMS_SENDER || "Ncars"));
}

/** Ответ сервиса для журнала: JSON с \uXXXX превращается в читаемый текст, ключ не попадает. */
export function readable(answer: string): string {
  let s = answer;
  try {
    const j = JSON.parse(answer);
    s = typeof j === "object" && j && ("error" in j || "message" in j) ? String(j.error ?? j.message) : JSON.stringify(j);
  } catch { /* не JSON — как есть */ }
  const key = process.env.SMS_API_KEY;
  if (key) s = s.split(key).join("***");
  return s.slice(0, 300);
}

export async function sendSms(phone: string, text: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER || "log";
  if (provider === "log") {
    console.log(`[SMS] ${phone}: ${text}`);
    return;
  }
  if (provider === "http") {
    const url = process.env.SMS_HTTP_URL;
    if (!url) throw new Error("SMS_HTTP_URL не задан");
    const method = (process.env.SMS_HTTP_METHOD || "GET").toUpperCase();
    const body = process.env.SMS_HTTP_BODY;
    const res = await fetch(fill(url, phone, text, true), {
      method,
      headers: body ? { "Content-Type": process.env.SMS_HTTP_CONTENT_TYPE || "application/json" } : undefined,
      body: method === "POST" && body ? fill(body, phone, text, false) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    const answer = await res.text();
    const okWord = process.env.SMS_HTTP_OK;
    if (!res.ok || (okWord && !answer.includes(okWord))) {
      throw new Error(`SMS-сервис ответил ${res.status}: ${readable(answer)}`);
    }
    return;
  }
  throw new Error(`Неизвестный SMS_PROVIDER: ${provider}`);
}
