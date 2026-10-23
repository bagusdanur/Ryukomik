import "server-only";

import { getCachedRole, getVerifiedUserId } from "@/lib/serverRoleCache";

export function bearerToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
}

export async function requireUserId(request: Request) {
  const token = bearerToken(request);
  if (!token) throw new Error("UNAUTHORIZED");
  let userId: string;
  try {
    userId = await getVerifiedUserId(token);
  } catch {
    throw new Error("UNAUTHORIZED");
  }
  // A banned account keeps a valid JWT until it expires, so block it here too.
  const role = await getCachedRole(userId);
  if (role.isBanned) throw new Error("BANNED");
  return userId;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new Error("BAD_ORIGIN");
  }

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = request.headers.get("host")?.trim();
  const allowedHosts = new Set(
    [forwardedHost, host, requestUrl.host, "ryukomik.my.id", "www.ryukomik.my.id"]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase()),
  );

  if (!allowedHosts.has(originUrl.host.toLowerCase())) throw new Error("BAD_ORIGIN");

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const expectedProtocol = forwardedProto ? `${forwardedProto}:` : requestUrl.protocol;
  const isCanonicalProductionOrigin =
    originUrl.protocol === "https:" &&
    ["ryukomik.my.id", "www.ryukomik.my.id"].includes(originUrl.hostname.toLowerCase());

  if (originUrl.protocol !== expectedProtocol && !isCanonicalProductionOrigin) {
    throw new Error("BAD_ORIGIN");
  }
}
