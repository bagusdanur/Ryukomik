export type DownloadChapter = {
  images: string[];
  chapterSlug?: string;
  currentChapter?: string;
};

export async function fetchDownloadChapter(
  source: string,
  slug: string,
): Promise<DownloadChapter> {
  let url: string;

  if (source.toLowerCase() === "project") {
    const parts = slug.split("/").filter(Boolean);
    const chapter = parts.pop();
    const mangaSlug = parts.join("/");
    if (!mangaSlug || !chapter) throw new Error("Slug chapter Project tidak valid");
    url = `/api/project/chapter/${encodeURIComponent(mangaSlug)}/${encodeURIComponent(chapter)}`;
  } else {
    url = `https://api.ryukomik.web.id/${encodeURIComponent(source)}/chapter/${slug}`;
  }

  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || `Gagal mengambil chapter (${response.status})`);
  }

  const images = Array.isArray(data?.images)
    ? data.images.filter((item: unknown): item is string => typeof item === "string" && item.length > 0)
    : [];

  return {
    images,
    chapterSlug: data?.chapterSlug || slug,
    currentChapter: data?.currentChapter,
  };
}

export async function fetchDownloadImage(url: string, page: number): Promise<Blob> {
  const response = await fetch(`/api/image?url=${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error(`Gambar halaman ${page} gagal dimuat (${response.status})`);

  const blob = await response.blob();
  if (!blob.type.startsWith("image/") || blob.size === 0) {
    throw new Error(`Data gambar halaman ${page} tidak valid`);
  }
  return blob;
}

export function imageExtension(blob: Blob): string {
  if (blob.type.includes("png")) return "png";
  if (blob.type.includes("webp")) return "webp";
  if (blob.type.includes("gif")) return "gif";
  return "jpg";
}

export function blobToPdfImage(blob: Blob): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    const timer = window.setTimeout(() => finish(new Error("Gambar timeout saat diproses")), 20_000);

    const finish = (error?: Error, value?: { dataUrl: string; width: number; height: number }) => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      if (error) reject(error);
      else if (value) resolve(value);
    };

    image.onload = () => {
      const maxWidth = 1000;
      const ratio = Math.min(1, maxWidth / image.naturalWidth);
      const width = Math.max(1, Math.round(image.naturalWidth * ratio));
      const height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return finish(new Error("Browser gagal memproses gambar"));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      finish(undefined, { dataUrl: canvas.toDataURL("image/jpeg", 0.9), width, height });
    };
    image.onerror = () => finish(new Error("Format gambar tidak dapat dibaca"));
    image.src = objectUrl;
  });
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
