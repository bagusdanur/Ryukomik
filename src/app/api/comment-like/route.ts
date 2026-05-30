import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

interface CommentLikePayload {
  comment_id?: string;
  user_id?: string;
}

export async function POST(req: Request) {
  try {
    const { comment_id, user_id } = (await req.json()) as CommentLikePayload;

    if (!user_id) {
      return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
    }

    // 1. Cek apakah user sudah pernah like
    const { data: exist } = await supabaseAdmin
      .from("comment_likes")
      .select("id")
      .eq("comment_id", comment_id)
      .eq("user_id", user_id)
      .maybeSingle();

    // 2. Ambil ID pemilik komentar untuk beri/tarik XP
    const { data: commentOwner } = await supabaseAdmin
      .from("comments")
      .select("user_id")
      .eq("id", comment_id)
      .single();

    const isOwnComment = commentOwner?.user_id === user_id;

    if (exist) {
      // --- PROSES UNLIKE ---
      await supabaseAdmin.from("comment_likes").delete().eq("id", exist.id);

      // Kurangi XP pemilik komentar (Like ditarik = -2 XP)
      // Jangan kurangi jika itu komentar milik diri sendiri
      if (commentOwner?.user_id && !isOwnComment) {
        await supabaseAdmin.rpc("increment_xp", {
          user_id: commentOwner.user_id,
          xp_amount: -2,
        });
      }
      return NextResponse.json({ liked: false });
    } else {
      // --- PROSES LIKE ---
      await supabaseAdmin.from("comment_likes").insert({ comment_id, user_id });

      // Tambah XP pemilik komentar (Dapat Like = +2 XP)
      if (commentOwner?.user_id && !isOwnComment) {
        await supabaseAdmin.rpc("increment_xp", {
          user_id: commentOwner.user_id,
          xp_amount: 5,
        });
      }
      return NextResponse.json({ liked: true });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
