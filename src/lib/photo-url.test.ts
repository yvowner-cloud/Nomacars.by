import { describe, expect, it } from "vitest";
import { hiRes, photoCandidates } from "./photo-url";

describe("hiRes", () => {
  it("Copart: превью → полный размер", () => {
    expect(hiRes("https://cs.copart.com/v1/AUTH_svc.pdoc00001/lpp/1123/abc_thb.jpg")).toBe("https://cs.copart.com/v1/AUTH_svc.pdoc00001/lpp/1123/abc_ful.jpg");
    expect(hiRes("https://cs.copart.com/v1/x/abc_ful.jpg")).toBe("https://cs.copart.com/v1/x/abc_ful.jpg");
  });
  it("IAAI: маленький resizer → 1024×768", () => {
    const u = hiRes("https://vis.iaai.com/resizer?imageKeys=123~SID~B1~I1&width=161&height=120");
    expect(u).toContain("width=1024");
    expect(u).toContain("height=768");
    expect(u).toContain("imageKeys=123");
  });
  it("Manheim: size=w86h64 → w1024h768; чужие адреса не трогаем", () => {
    expect(hiRes("https://images.cdn.manheim.com/abc.jpg?size=w86h64")).toContain("size=w1024h768");
    expect(hiRes("https://example.com/a_thb.jpg")).toBe("https://example.com/a_thb.jpg");
    expect(hiRes("не адрес")).toBe("не адрес");
  });
});

describe("allowedPhoto", () => {
  it("только https с сайтов аукционов", async () => {
    const { allowedPhoto } = await import("./server/photo-proxy");
    expect(allowedPhoto("https://cs.copart.com/a.jpg")?.referer).toBe("https://www.copart.com/");
    expect(allowedPhoto("https://vis.iaai.com/resizer?x=1")).not.toBeNull();
    expect(allowedPhoto("http://cs.copart.com/a.jpg")).toBeNull();
    expect(allowedPhoto("https://evilcopart.com/a.jpg")).toBeNull();
    expect(allowedPhoto("https://copart.com.evil.ru/a.jpg")).toBeNull();
    expect(allowedPhoto("https://127.0.0.1/a.jpg")).toBeNull();
    expect(allowedPhoto("https://cs.copart.com:8443/a.jpg")).toBeNull();
  });
});

describe("photoCandidates", () => {
  it("сначала большой, потом исходный, потом другие фото", () => {
    const v = (u: string) => `/api/photo?u=${encodeURIComponent(u)}`;
    const c = photoCandidates(["https://cs.copart.com/a_thb.jpg", "https://cs.copart.com/b_ful.jpg"]);
    expect(c).toEqual([v("https://cs.copart.com/a_ful.jpg"), v("https://cs.copart.com/a_thb.jpg"), "https://cs.copart.com/a_thb.jpg",
      v("https://cs.copart.com/b_ful.jpg"), "https://cs.copart.com/b_ful.jpg"]);
    expect(photoCandidates(["https://cs.copart.com/a_ful.jpg", "https://x/b.jpg"], 1, false)).toEqual([v("https://x/b.jpg"), "https://x/b.jpg"]);
    expect(photoCandidates([])).toEqual([]);
  });
});
