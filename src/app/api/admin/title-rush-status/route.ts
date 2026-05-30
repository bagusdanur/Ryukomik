import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import {
  getTitleRushEventStatus,
  setTitleRushEventStatus,
} from "@/lib/titleRushEvent";

async function verifyAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Login diperlukan.", status: 401 } as const;

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: "Sesi login tidak valid.", status: 401 } as const;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { error: "Akses admin diperlukan.", status: 403 } as const;
  }

  return { userId: authData.user.id } as const;
}

export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const status = await getTitleRushEventStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json().catch(() => ({}));
    const enabled = body?.enabled === true;
    const status = await setTitleRushEventStatus(enabled);

    return NextResponse.json({
      ...status,
      message: enabled ? "Event Title Rush dibuka." : "Event Title Rush ditutup.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal update status event." },
      { status: 500 },
    );
  }
}
