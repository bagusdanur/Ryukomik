export function nekoImg(url?: string | null): string {
  if (!url) return "";
  return `https://apiv2.ryukomik.web.id/neko/image?url=${encodeURIComponent(url)}`;
}
