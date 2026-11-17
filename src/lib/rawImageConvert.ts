import sharp, { type OverlayOptions } from "sharp";

/**
 * Gabungkan halaman RAW menjadi beberapa strip WebP vertikal.
 *
 * Mengikuti converter RyukomikBot (merge_images_lossless), dengan batas tinggi
 * 12.000 px — batas yang sama dengan alur upload project kita (toWebp melewati
 * konversi kalau tinggi > 12.000), sehingga hasil unduhan bisa langsung dipakai
 * di Studio tanpa terkena batas itu.
 *
 * Catatan performa: halaman yang sudah memenuhi batas lebar dipakai apa adanya
 * (tanpa encode PNG perantara). Encode ulang hanya dilakukan untuk halaman yang
 * perlu dikecilkan atau dipotong. `effort: 0` sama seperti bot: kualitas tetap,
 * tapi jauh lebih cepat untuk kanvas panjang.
 */

export const STRIP_MAX_HEIGHT = 16_000;
/** Batas aman libwebp: kanvas 16.000 px kadang gagal encode, jadi ada fallback. */
export const STRIP_SAFE_HEIGHT = 12_000;
/** Lebar dibatasi supaya kanvas tidak memakan ratusan MB (EvaScan bisa 16.000 px). */
export const STRIP_MAX_WIDTH = 2_000;
export const STRIP_QUALITY = 95;

export type Strip = { name: string; data: Buffer };

type Page = { buffer: Buffer; width: number; height: number };
type Slice = { buffer: Buffer; width: number; height: number };

async function readPage(input: Buffer): Promise<Page | null> {
  try {
    const meta = await sharp(input, { failOn: "none" }).metadata();
    if (!meta.width || !meta.height) return null;

    // Hanya proses ulang kalau perlu: terlalu lebar atau ada rotasi EXIF.
    if (meta.width > STRIP_MAX_WIDTH || (meta.orientation && meta.orientation !== 1)) {
      const buffer = await sharp(input, { failOn: "none" })
        .rotate()
        .resize({ width: STRIP_MAX_WIDTH, withoutEnlargement: true })
        .png({ compressionLevel: 3 })
        .toBuffer();
      const processed = await sharp(buffer).metadata();
      if (!processed.width || !processed.height) return null;
      return { buffer, width: processed.width, height: processed.height };
    }

    return { buffer: input, width: meta.width, height: meta.height };
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
      .png({ compressionLevel: 3 })
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
    return sharp({ create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } } })
      .composite(composites)
      .webp({ quality, effort: 0 })
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
      // Kanvas 16.000 px kadang ditolak libwebp. Pecah per potongan supaya
      // unduhan tetap berhasil, hanya jumlah filenya bertambah.
      for (const slice of group) {
        const data = await encodeGroup([slice]);
        part += 1;
        strips.push({ name: `${stem}_part${String(part).padStart(3, "0")}.webp`, data });
      }
    }
  }

  return strips;
}
