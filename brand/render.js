// Пересобрать PNG-файлы бренда: node brand/render.js (нужен Playwright)
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const out = {
  "ig-avatar": "brand/instagram-avatar-1080.png",
  "ig-wordmark": "brand/instagram-logo-1080.png",
  apple: "src/app/apple-icon.png",
  android: "public/icon-512.png",
  fav32: "brand/favicon-32.png",
  fav16: "brand/favicon-16.png",
};

(async () => {
  const root = path.resolve(__dirname, "..");
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 2400, height: 2400 }, deviceScaleFactor: 1 });
  await p.goto("file://" + path.join(root, "brand/render.html"), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  for (const [id, file] of Object.entries(out)) {
    await (await p.$("#" + id)).screenshot({ path: path.join(root, file), omitBackground: false });
    console.log("✓", file);
  }
  await b.close();

  // favicon.ico из PNG 16 и 32 (ICO с PNG внутри поддерживают все современные браузеры)
  const imgs = ["brand/favicon-16.png", "brand/favicon-32.png"].map((f) => fs.readFileSync(path.join(root, f)));
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(imgs.length, 4);
  let offset = 6 + 16 * imgs.length;
  const dirs = imgs.map((img, i) => {
    const size = i === 0 ? 16 : 32;
    const d = Buffer.alloc(16);
    d.writeUInt8(size, 0); d.writeUInt8(size, 1); d.writeUInt8(0, 2); d.writeUInt8(0, 3);
    d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(img.length, 8); d.writeUInt32LE(offset, 12);
    offset += img.length;
    return d;
  });
  fs.writeFileSync(path.join(root, "src/app/favicon.ico"), Buffer.concat([header, ...dirs, ...imgs]));
  console.log("✓ src/app/favicon.ico");
})();
