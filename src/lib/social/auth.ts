import "server-only";

import { getVerifiedUserId } from "@/lib/serverRoleCache";

export function bearerToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
}

export async function requireUserId(request: Request) {
  const token = bearerToken(request);
  if (!token) throw new Error("UNAUTHORIZED");
  try {
    return await getVerifiedUserId(token);
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (origin !== new URL(request.url).origin) throw new Error("BAD_ORIGIN");
}
