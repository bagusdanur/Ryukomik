import { NextResponse } from "next/server";
import { getRoleFromBearerToken } from "@/lib/serverRoleCache";

export async function verifyAdminRequest(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Login diperlukan.", status: 401 } as const;

  let authData;
  try {
    authData = await getRoleFromBearerToken(token);
  } catch {
    return { error: "Sesi login tidak valid.", status: 401 } as const;
  }

  if (!authData.isAdmin) {
    return { error: "Akses admin diperlukan.", status: 403 } as const;
  }

  return { userId: authData.userId } as const;
}

export function adminErrorResponse(error: unknown, fallback = "Terjadi kesalahan") {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  );
}

export function privateAdminJson(data: unknown) {
  const response = NextResponse.json(data);
  response.headers.set("Cache-Control", "private, max-age=30");
  return response;
}
