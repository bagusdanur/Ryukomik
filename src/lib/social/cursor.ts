export type SocialCursor = { createdAt: string; id: string };

export function encodeSocialCursor(createdAt?: string | null, id?: string | number | null) {
  if (!createdAt || id === null || id === undefined) return null;
  return Buffer.from(JSON.stringify({ createdAt, id: String(id) }), "utf8").toString("base64url");
}

export function decodeSocialCursor(value: string | null): SocialCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SocialCursor>;
    if (!parsed.createdAt || !parsed.id || Number.isNaN(Date.parse(parsed.createdAt))) return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}
