export function nekoImg(url?: string | null): string {
  if (!url) return "";
  return `https://apiv2.ryukomik.com/neko/image?url=${encodeURIComponent(url)}`;
}
