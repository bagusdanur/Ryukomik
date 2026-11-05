import { NextResponse } from "next/server";
import {
  getRoleFromBearerToken,
  ROLE_CACHE_SECONDS,
} from "@/lib/serverRoleCache";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
  }

  try {
    const role = await getRoleFromBearerToken(token);
    const response = NextResponse.json({
      role: role.role,
      isAdmin: role.isAdmin,
    });
    // no-store: cache browser sempat menyimpan isAdmin=false setelah ganti akun.
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Sesi login tidak valid." }, { status: 401 });
  }
}
