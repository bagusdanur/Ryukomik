import sharp, { type OverlayOptions } from "sharp";

/**
 * Gabungkan halaman RAW menjadi beberapa strip WebP vertikal — MODE HD.
 *
 * Prioritas utama: tidak boleh ada penurunan kualitas, karena hasilnya dipakai
 * untuk project translasi (TL/TS). Konsekuensinya:
 *
 *  - WebP LOSSLESS (tanpa kompresi hilang). Piksel sumber dipertahankan persis.
 *  - Tidak ada resize. Lebar sumber berapa pun dipakai apa adanya, selama masih
 *    di dalam batas WebP (16.383 px). Tidak ada "kanvas 2.000 px" lagi.
 *  - Kanvas memakai channel alpha (4), supaya transparansi sumber tidak berubah
 *    jadi putih. Latar hanya dipakai saat gambar benar-benar perlu di-flatten.
 *  - Potongan/slice memakai extract langsung, tanpa encode PNG perantara.
 *
 * Batas tinggi 16.000 px tetap dipakai agar tiap strip tidak melebihi batas
 * WebP. Kalau libwebp menolak kanvas, grup dipecah per halaman.
 */

/** Batas tinggi WebP: 16.383 px. Kita pakai 16.000 untuk margin aman. */
export const STRIP_MAX_HEIGHT = 16_000;
/** Batas lebar WebP: 16.383 px. Tidak ada resize di bawah batas ini. */
export const STRIP_MAX_WIDTH = 16_383;
/** Mode HD: lossless, quality diabaikan. */
export const STRIP_LOSSLESS = true;

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
  _quality = 100,
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
      .webp({ lossless: STRIP_LOSSLESS })
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
