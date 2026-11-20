import { describe, expect, it } from "vitest";
import { readable } from "./sms";

describe("readable", () => {
  it("раскодирует ошибку sms.by", () => {
    expect(readable('{"error":"\\u043e\\u0448\\u0438\\u0431\\u043a\\u0430 \\u0432 \\u0431\\u0443\\u043a\\u0432\\u0435\\u043d\\u043d\\u043e\\u043c \\u0438\\u043c\\u0435\\u043d\\u0438"}')).toBe("ошибка в буквенном имени");
  });
  it("прячет ключ и не ломается на не-JSON", () => {
    process.env.SMS_API_KEY = "secret123";
    expect(readable("bad token secret123")).toBe("bad token ***");
    delete process.env.SMS_API_KEY;
  });
});
