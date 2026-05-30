import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

// ✅ TAMBAH INI — Pastikan Node.js runtime (bukan edge)
export const runtime = "nodejs";

interface XpReadPayload {
  user_id?: string;
  chapter_slug?: string;
}

export async function POST(req: Request) {
  try {
    const { user_id, chapter_slug } = (await req.json()) as XpReadPayload;

    if (!user_id || !chapter_slug) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    // ✅ GANTI INI — Cek hanya hari ini (bukan selamanya)
    const today = new Date().toISOString().split("T")[0];
    const { data: exist } = await supabaseAdmin
      .from("user_reads")
      .select("id")
      .eq("user_id", user_id)
      .eq("chapter_slug", chapter_slug)
      .gte("created_at", today)  // ← hanya cek hari ini
      .maybeSingle();

    if (exist) {
      return NextResponse.json({ success: true, cached: true });
    }

    // Insert + XP (tetap sama)
    await supabaseAdmin.from("user_reads").insert({
      user_id,
      chapter_slug,
    });

    await supabaseAdmin.rpc("increment_xp", {
      user_id,
      xp_amount: 5,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[XP Read] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
