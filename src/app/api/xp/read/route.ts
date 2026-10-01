import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";

interface XpReadPayload {
  user_id?: string;
  chapter_slug?: string;
}

export async function POST(req: Request) {
  try {
    // sendBeacon/fetch occasionally delivers an empty or truncated body. Parse
    // defensively: a malformed body must return 400, not throw into the 500
    // handler, because a 500 pushes the client into its retry queue and turns
    // one bad beacon into several repeat requests.
    let payload: XpReadPayload = {};
    try {
      const text = await req.text();
      if (text) payload = JSON.parse(text) as XpReadPayload;
    } catch {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const { user_id, chapter_slug } = payload;

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
