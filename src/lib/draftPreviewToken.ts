import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

type DraftPreviewPayload = {
  chapterId: string;
  expiresAt: number;
};

const MAX_PREVIEW_AGE_SECONDS = 7 * 24 * 60 * 60;

function previewSecret() {
  const secret = process.env.DRAFT_PREVIEW_SECRET || process.env.PROJECT_API_INTERNAL_TOKEN;
  if (!secret) throw new Error("Draft preview secret is not configured");
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", previewSecret()).update(payload).digest("base64url");
}

export function createDraftPreviewToken(chapterId: string) {
  const payload: DraftPreviewPayload = {
    chapterId,
    expiresAt: Math.floor(Date.now() / 1000) + MAX_PREVIEW_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyDraftPreviewToken(token: string): DraftPreviewPayload | null {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return null;

  const expectedSignature = signature(encoded);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DraftPreviewPayload;
    if (!payload.chapterId || !Number.isSafeInteger(payload.expiresAt)) return null;
    if (payload.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
