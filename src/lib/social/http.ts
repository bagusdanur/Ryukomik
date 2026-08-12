import { NextResponse } from "next/server";

const requests = new Map<string, { startedAt: number; count: number }>();

export function socialLimit(request: Request, userId: string, max = 30) {
  const key = `${userId}:${new URL(request.url).pathname}`;
  const now = Date.now();
  const current = requests.get(key);
  if (!current || now - current.startedAt > 60_000) {
    requests.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= max;
}

export function socialJson(data: unknown, init?: ResponseInit) {
  const body = JSON.stringify(data);
  const response = new NextResponse(body, {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...init?.headers },
  });
  response.headers.set("Server-Timing", `app;desc=\"social\", bytes;desc=\"${Buffer.byteLength(body)}\"`);
  if (process.env.NODE_ENV !== "test") {
    console.info(`[social-egress] ${response.status} ${Buffer.byteLength(body)} bytes`);
  }
  return response;
}

export function socialError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  if (message === "UNAUTHORIZED") return socialJson({ error: "Login diperlukan." }, { status: 401 });
  if (message === "BAD_ORIGIN") return socialJson({ error: "Origin tidak valid." }, { status: 403 });
  console.error("[social-api]", error);
  return socialJson({ error: "Terjadi kesalahan." }, { status: 500 });
}
