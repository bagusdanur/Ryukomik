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
    response.headers.set("Cache-Control", `private, max-age=${ROLE_CACHE_SECONDS}`);
    return response;
  } catch {
    return NextResponse.json({ error: "Sesi login tidak valid." }, { status: 401 });
  }
}
