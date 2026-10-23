import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { requireUserId } from "@/lib/social/auth";
import { resolveActorUserId } from "@/lib/requestAuthPolicy";

interface ReactionPayload {
  comment_id?: string;
  kind?: string;
  user_id?: string;
}

export async function POST(req: Request) {
  try {
    const { comment_id, kind } = (await req.json()) as ReactionPayload;
    if (!comment_id || !kind)
      return NextResponse.json({ error: "Missing" }, { status: 400 });

    // Reacting requires a real session; body user_id is untrusted.
    let tokenUserId: string | null = null;
    try {
      tokenUserId = await requireUserId(req);
    } catch {
      tokenUserId = null;
    }
    const user_id = resolveActorUserId(tokenUserId);
    if (!user_id) {
      return NextResponse.json({ error: "Harus login dulu" }, { status: 401 });
    }

    // upsert reaction (toggle): if exists remove, else insert
    // Cek apakah reaction exist
    const { data: exists } = await supabaseAdmin
      .from("comment_reactions")
      .select("id")
      .match({ comment_id, kind, user_id })
      .limit(1);

    if (exists && exists.length) {
      // hapus (toggle off)
      await supabaseAdmin
        .from("comment_reactions")
        .delete()
        .match({ id: exists[0].id });
      return NextResponse.json({ success: true, action: "removed" });
    }

    // insert new
    const { data, error } = await supabaseAdmin
      .from("comment_reactions")
      .insert({
        comment_id,
        kind,
        user_id: user_id || null,
      })
      .select("id, comment_id, kind, user_id")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, reaction: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
