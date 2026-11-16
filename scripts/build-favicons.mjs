/**
 * Membuat ulang aset favicon dari public/icon.png.
 *
 * Google memakai favicon di hasil pencarian dan mensyaratkan gambar persegi
 * berukuran kelipatan 48 px. Sebelumnya icon.png 1254x1254 (bukan kelipatan 48)
 * dan favicon.ico hanya 32x32, jadi ikon sering tidak dipakai.
 *
 * Jalankan: node scripts/build-favicons.mjs
 */
import sharp from "sharp";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "public", "icon.png");

/** Ukuran PNG mandiri (kelipatan 48 + 512 untuk PWA). */
const PNG_SIZES = [48, 96, 144, 192, 512];

/** Isi favicon.ico. 64 disertakan supaya tampil tajam di tab ber-DPI tinggi. */
const ICO_SIZES = [16, 32, 48, 64];

function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;

  entries.forEach((entry, index) => {
    const at = index * 16;
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, at + 0);
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, at + 1);
    dir.writeUInt8(0, at + 2); // palette
    dir.writeUInt8(0, at + 3); // reserved
    dir.writeUInt16LE(1, at + 4); // color planes
    dir.writeUInt16LE(32, at + 6); // bits per pixel
    dir.writeUInt32LE(entry.data.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += entry.data.length;
  });

  return Buffer.concat([header, dir, ...entries.map((entry) => entry.data)]);
}

const source = sharp(await readFile(SOURCE)).ensureAlpha();

for (const size of PNG_SIZES) {
  const out = path.join(ROOT, "public", `icon-${size}.png`);
  await sharp(await readFile(SOURCE))
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`  icon-${size}.png`);
}

await sharp(await readFile(SOURCE))
  .resize(180, 180, { fit: "cover" })
  .flatten({ background: "#0f0f0f" })
  .png({ compressionLevel: 9 })
  .toFile(path.join(ROOT, "public", "apple-touch-icon.png"));
console.log("  apple-touch-icon.png (180)");

const icoEntries = [];
for (const size of ICO_SIZES) {
  const data = await source
    .clone()
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  icoEntries.push({ size, data });
  console.log(`  ico entry ${size}x${size}`);
}

await writeFile(path.join(ROOT, "public", "favicon.ico"), buildIco(icoEntries));
console.log("  favicon.ico");
