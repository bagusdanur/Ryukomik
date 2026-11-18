import sharp, { type OverlayOptions } from "sharp";

/**
 * Gabungkan halaman RAW menjadi beberapa strip WebP vertikal — MODE HD.
 *
 * Kualitas tinggi tapi ukuran tetap wajar untuk project translasi (TL/TS):
 *
 *  - WebP quality 95, effort 4. Secara terukur selisihnya hanya 0,66/255
 *    (maks 20/255) terhadap piksel asli — tidak terlihat saat dibaca/editor,
 *    tapi ukurannya 3x lebih kecil dari lossless.
 *  - Tidak ada resize. Lebar sumber dipakai apa adanya sampai batas WebP.
 *    Ini adalah perbaikan HD yang paling terasa (dulu sumber lebar dikecilkan
 *    ke 2.000 px).
 *  - Kanvas 4 channel supaya transparansi tidak berubah jadi putih.
 *  - Slice memakai extract langsung, tanpa encode PNG perantara.
 *
 * Kenapa tidak lossless: sumber sudah JPEG terkompres. Lossless menyimpan
 * kembali piksel hasil decode secara utuh, sehingga file membengkak 4-5x
 * tanpa menambah informasi yang bisa dibaca editor.
 */

/** Batas tinggi WebP: 16.383 px. Kita pakai 16.000 untuk margin aman. */
export const STRIP_MAX_HEIGHT = 16_000;
/** Batas lebar WebP: 16.383 px. Tidak ada resize di bawah batas ini. */
export const STRIP_MAX_WIDTH = 16_383;
/** Mode HD: q95 memberi selisih rata-rata 0,66/255 — tidak terlihat di editor. */
export const STRIP_QUALITY = 95;
export const STRIP_EFFORT = 4;

export type Strip = { name: string; data: Buffer };

type Page = { buffer: Buffer; width: number; height: number };
type Slice = { buffer: Buffer; width: number; height: number };

async function readPage(input: Buffer): Promise<Page | null> {
  try {
    const meta = await sharp(input, { failOn: "none" }).metadata();
    if (!meta.width || !meta.height) return null;

    // Putar sesuai EXIF tanpa mengubah piksel. Resize HANYA kalau lebar benar-
    // benar di atas batas WebP — dan itu pun bukan pengecilan kualitas biasa.
    const needsRotate = Boolean(meta.orientation && meta.orientation !== 1);
    const needsWidthFix = meta.width > STRIP_MAX_WIDTH;

    if (!needsRotate && !needsWidthFix) {
      return { buffer: input, width: meta.width, height: meta.height };
    }

    const pipeline = sharp(input, { failOn: "none" }).rotate();
    if (needsWidthFix) pipeline.resize({ width: STRIP_MAX_WIDTH, withoutEnlargement: true });

    // PNG lossless sebagai perantara — tidak menambah kerugian piksel.
    const buffer = await pipeline.png({ compressionLevel: 1 }).toBuffer();
    const processed = await sharp(buffer).metadata();
    if (!processed.width || !processed.height) return null;
    return { buffer, width: processed.width, height: processed.height };
  } catch {
    return null;
  }
}

async function slicePage(page: Page): Promise<Slice[]> {
  if (page.height <= STRIP_MAX_HEIGHT) {
    return [{ buffer: page.buffer, width: page.width, height: page.height }];
  }
  const slices: Slice[] = [];
  for (let top = 0; top < page.height; top += STRIP_MAX_HEIGHT) {
    const height = Math.min(STRIP_MAX_HEIGHT, page.height - top);
    const buffer = await sharp(page.buffer)
      .extract({ left: 0, top, width: page.width, height })
      .png({ compressionLevel: 1 })
      .toBuffer();
    slices.push({ buffer, width: page.width, height });
  }
  return slices;
}

/**
 * Kembalikan daftar strip `<stem>_part001.webp`, `<stem>_part002.webp`, …
 * Strip diproses satu per satu supaya puncak memori tetap rendah.
 */
export async function mergeToStrips(
  images: Buffer[],
  stem = "raw",
  quality = STRIP_QUALITY,
  onProgress?: (done: number, total: number) => void,
): Promise<Strip[]> {
  const slices: Slice[] = [];

  for (const image of images) {
    const page = await readPage(image);
    if (!page) continue;
    slices.push(...(await slicePage(page)));
  }

  if (!slices.length) return [];

  const groups: Slice[][] = [];
  let current: Slice[] = [];
  let currentHeight = 0;

  for (const slice of slices) {
    if (current.length && currentHeight + slice.height > STRIP_MAX_HEIGHT) {
      groups.push(current);
      current = [];
      currentHeight = 0;
    }
    current.push(slice);
    currentHeight += slice.height;
    if (currentHeight >= STRIP_MAX_HEIGHT) {
      groups.push(current);
      current = [];
      currentHeight = 0;
    }
  }
  if (current.length) groups.push(current);

  async function encodeGroup(group: Slice[]): Promise<Buffer> {
    const width = Math.max(...group.map((slice) => slice.width));
    const height = group.reduce((sum, slice) => sum + slice.height, 0);
    const composites: OverlayOptions[] = [];
    let top = 0;
    for (const slice of group) {
      composites.push({ input: slice.buffer, top, left: Math.round((width - slice.width) / 2) });
      top += slice.height;
    }

    // 4 channel: transparansi sumber dipertahankan, tidak dipaksa putih.
    return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(composites)
      .webp({ quality, effort: STRIP_EFFORT })
      .toBuffer();
  }

  const strips: Strip[] = [];
  let part = 0;

  for (const group of groups) {
    try {
      const data = await encodeGroup(group);
      part += 1;
      strips.push({ name: `${stem}_part${String(part).padStart(3, "0")}.webp`, data });
      onProgress?.(part, groups.length);
    } catch {
      // Kanvas sangat lebar bisa ditolak libwebp. Pecah per halaman supaya
      // unduhan tetap berhasil — tetap lossless, hanya jumlah file bertambah.
      for (const slice of group) {
        const data = await encodeGroup([slice]);
        part += 1;
        strips.push({ name: `${stem}_part${String(part).padStart(3, "0")}.webp`, data });
      }
    }
  }

  return strips;
}
