/**
 * Bangun ulang favicon agar logo mengisi kanvas.
 *
 * Sumber icon.png punya margin hitam besar: logo hanya menempati 61% lebar
 * kanvas, sehingga pada 16-32 px huruf R terlihat kecil dan Google sulit
 * memakainya di hasil pencarian. Skrip ini memangkas margin, lalu menempatkan
 * logo pada 88% kanvas dengan latar hitam.
 *
 * Jalankan: node scripts/rebuild-favicons.mjs [sufiks]
 */
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "public", "icon.png");
const SUFFIX = process.argv[2] ?? "-v3";
const FILL = 0.88; // porsi kanvas yang diisi logo
const PNG_SIZES = [48, 96, 144, 192, 512];
const ICO_SIZES = [16, 32, 48, 64];

const art = await sharp(await readFile(SOURCE)).trim({ threshold: 12 }).toBuffer();

async function tile(size, fill = FILL) {
  const inner = Math.max(8, Math.round(size * fill));
  const logo = await sharp(art)
    .resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach((entry, index) => {
    const at = index * 16;
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, at);
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, at + 1);
    dir.writeUInt16LE(1, at + 4);
    dir.writeUInt16LE(32, at + 6);
    dir.writeUInt32LE(entry.data.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += entry.data.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
}

for (const size of PNG_SIZES) {
  const buf = await tile(size);
  await writeFile(path.join(ROOT, "public", `icon${SUFFIX}-${size}.png`), buf);
  console.log(`  icon${SUFFIX}-${size}.png  ${Math.round(buf.length / 1024)} KB`);
}

// apple-touch: tanpa transparansi, sudut tidak dipotong sistem
const apple = await tile(180, 0.82);
await writeFile(path.join(ROOT, "public", `apple-touch-icon${SUFFIX}.png`), apple);
console.log(`  apple-touch-icon${SUFFIX}.png  ${Math.round(apple.length / 1024)} KB`);

const icoEntries = [];
for (const size of ICO_SIZES) icoEntries.push({ size, data: await tile(size, 0.92) });
const ico = buildIco(icoEntries);
await writeFile(path.join(ROOT, "public", `favicon${SUFFIX}.ico`), ico);
console.log(`  favicon${SUFFIX}.ico  ${Math.round(ico.length / 1024)} KB`);
