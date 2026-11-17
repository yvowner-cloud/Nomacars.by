// Пересобрать логотипы NCARS.BY: node brand/ncars/render.js (нужен Playwright)
const { chromium } = require("playwright");
const path = require("path");

const out = {
  avatar: "ncars-avatar-1080.png",
  post: "ncars-logo-1080.png",
  wide: "ncars-logo-1600x400.png",
};

(async () => {
  const dir = __dirname;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 2400, height: 2400 }, deviceScaleFactor: 1 });
  await p.goto("file://" + path.join(dir, "render.html"), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  for (const [id, file] of Object.entries(out)) {
    await (await p.$("#" + id)).screenshot({ path: path.join(dir, file) });
    console.log("✓ brand/ncars/" + file);
  }
  await b.close();
})();
