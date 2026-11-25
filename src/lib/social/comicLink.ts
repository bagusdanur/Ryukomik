// Parses community posts that embed a Ryukomik comic/chapter link (created by
// the "Bahas komik" card on comic detail pages) so UIs can render a compact
// preview with a Read button instead of a bare URL + full-size cover image.

export type ComicLinkInfo = {
  kind: "komik" | "chapter" | "nobar";
  href: string;
  title: string;
  note: string;
};

const COMIC_URL_RE =
  /https?:\/\/(?:(?:www|v1)\.)?ryukomik\.(?:com|my\.id|web\.id|id)\/(komik|chapter)\/([a-z0-9-]+)\/([^\s?#]+)/i;

const NOBAR_URL_RE =
  /https?:\/\/(?:(?:www|v1)\.)?ryukomik\.(?:com|my\.id|web\.id|id)\/anime\/nobar\/([a-z0-9-]+)/i;

function prettifySlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function parseComicPost(content?: string | null): ComicLinkInfo | null {
  if (!content || content === "[sticker]") return null;

  const nobarMatch = content.match(NOBAR_URL_RE);
  if (nobarMatch) {
    const roomId = nobarMatch[1].replace(/[),.!?;:]+$/, "");
    const href = `/anime/nobar/${roomId}`;
    const lines = content
      .replace(nobarMatch[0], "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const intro = lines[0]?.match(/^(?:Lagi nobar|Yuk nobar|Nobar)[:\s]*(.+)$/i);
    const title = intro ? intro[1].trim() : "Ruang Nobar Anime";
    const note = lines.slice(intro ? 1 : 0).join("\n").trim();

    return { kind: "nobar", href, title, note };
  }

  const match = content.match(COMIC_URL_RE);
  if (!match) return null;

  const kind = match[1].toLowerCase() as "komik" | "chapter";
  const source = match[2].toLowerCase();
  // Trailing punctuation is common when links are retyped by hand.
  const slug = match[3].replace(/[),.!?;:]+$/, "");
  const href = `/${kind}/${source}/${slug}`;

  const lines = content
    .replace(match[0], "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const intro = lines[0]?.match(/^Lagi baca[:\s]*(.+)$/i);
  const title = intro ? intro[1].trim() : prettifySlug(slug);
  const note = lines.slice(intro ? 1 : 0).join("\n").trim();

  return { kind, href, title, note };
}
