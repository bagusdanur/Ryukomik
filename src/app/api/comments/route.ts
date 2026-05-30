import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

type CommentLikeRow = {
  comment_id: string;
};

type CommentRow = {
  id: string;
  author_name?: string | null;
  avatar_url?: string | null;
  profiles?: unknown;
  likes?: { count?: number } | { count?: number }[];
  [key: string]: unknown;
};

type CreateCommentBody = {
  type?: string;
  slug?: string;
  chapter?: string;
  content?: string;
  parent_id?: string;
  author_name?: string;
  user_id?: string;
  avatar_url?: string;
  is_spoiler?: boolean;
};

function getLikesCount(likes: CommentRow["likes"]): number {
  if (Array.isArray(likes)) return likes[0]?.count || 0;
  return likes?.count || 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "komik";
  const slug = url.searchParams.get("slug");
  const chapter = url.searchParams.get("chapter");
  const sort = url.searchParams.get("sort") || "new";
  const requestedLimit = parseInt(url.searchParams.get("limit") || "20", 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 50)
    : 20;
  const userId = url.searchParams.get("user_id");

  // QUERY UTAMA: Ambil semua komentar dan profiles yang berelasi
  let query = supabaseAdmin
    .from("comments")
    .select(`
      id,
      type,
      slug,
      chapter,
      content,
      parent_id,
      author_name,
      user_id,
      avatar_url,
      is_spoiler,
      created_at,
      likes:comment_likes(count),
      profiles (
        xp,
        level,
        role,
        is_premium,
        username,
        avatar_url,
        total_comments
      )
    `)
    .order('created_at', { ascending: false })
  .limit(limit);
  if (slug) query = query.eq("slug", slug);
  if (chapter) {
    query = query.eq("chapter", chapter);
  } else {
    query = query.is("chapter", null);
  }

  if (sort === "old") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "popular") {
    query = query.order("count", { ascending: false, foreignTable: "comment_likes" });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ambil ID komentar yang di-like user login (Opsional)
  let userLikes: string[] = [];
  if (userId) {
    const { data: liked } = await supabaseAdmin
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", userId);
    userLikes = ((liked || []) as CommentLikeRow[]).map((l) => l.comment_id);
  }

  // Gabungkan data
  const fixed = ((data || []) as CommentRow[]).map((item) => ({
    ...item,
    // Jika profiles NULL (user hapus akun/anonim), beri nilai default
    profiles: item.profiles || {
      level: 1,
      xp: 0,
      username: item.author_name,
      avatar_url: item.avatar_url,
    },
    likes: getLikesCount(item.likes),
    liked_by_me: userLikes.includes(item.id),
  }));

  return NextResponse.json(fixed);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateCommentBody;
    const { type, slug, chapter, content, parent_id, author_name, user_id, avatar_url,is_spoiler } = body;
        // 🔥 WAJIB LOGIN DI SINI
    if (!user_id) {
      return NextResponse.json(
        { error: "Harus login dulu" },
        { status: 401 }
      );
    }
    // PERBAIKAN: Hapus pengecekan wajib user_id agar anonim bisa komen
    if (!type || !content) {
      return NextResponse.json({ error: "Konten atau Type kosong" }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user_id)
      .maybeSingle();

    const { data: comment, error: errInsert } = await supabaseAdmin
      .from("comments")
      .insert({
        type,
        slug: slug || null,
        chapter: chapter || null,
        content,
        parent_id: parent_id || null,
        author_name: profile?.username || author_name || "Anonim",
        user_id: user_id || null, // Biarkan null jika tidak login
        avatar_url: profile?.avatar_url || avatar_url || null,
        is_spoiler: is_spoiler || false
      })
      .select("id, type, slug, chapter, content, parent_id, author_name, user_id, avatar_url, is_spoiler, created_at")
      .single();

    if (errInsert) throw errInsert;

    // Tambah XP hanya jika user login (punya user_id)
   if (user_id) {
  const xpGain = parent_id ? 5 : 10; // 20 XP untuk komen utama
  
  const { error: rpcError } = await supabaseAdmin.rpc("increment_xp", {
    user_id: user_id,   // Harus sesuai dengan parameter di SQL
    xp_amount: xpGain   // Harus sesuai dengan parameter di SQL
  });

  if (rpcError) console.error("Gagal tambah XP:", rpcError.message);
}

    return NextResponse.json({ success: true, comment });
  } catch (err) {
    console.error("POST Error:", errorMessage(err));
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
