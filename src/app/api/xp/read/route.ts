import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

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

    const { data: recorded, error } = await supabaseAdmin.rpc("record_user_read", {
      p_user_id: user_id,
      p_chapter_slug: chapter_slug,
      p_xp_amount: 5,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, cached: !recorded });
  } catch (err) {
    console.error("[XP Read] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
