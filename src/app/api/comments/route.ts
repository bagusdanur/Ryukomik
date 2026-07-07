import type { NextRequest } from "next/server";
import { revalidateTag, unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

type CommentRow = {
  id: string;
  author_name?: string | null;
  avatar_url?: string | null;
  profiles?: unknown;
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan";
}

const COMMENTS_REVALIDATE_SECONDS = 300;

const getCachedComments = unstable_cache(
  async (
    type: string,
    slug: string | null,
    chapter: string | null,
    sort: string,
    limit: number,
  ) => {
    let query = supabaseAdmin
      .from("comments")
      .select(`
        id,
        content,
        parent_id,
        author_name,
        user_id,
        avatar_url,
        is_spoiler,
        created_at,
        profiles (
          xp,
          level,
          role,
          is_premium,
          username,
          avatar_url
        )
      `)
      .limit(limit);

    query = query.eq("type", type);
    if (slug) query = query.eq("slug", slug);
    if (chapter) {
      query = query.eq("chapter", chapter);
    } else {
      query = query.is("chapter", null);
    }

    query = query.order("created_at", { ascending: sort === "old" });

    const { data, error } = await query;
    if (error) throw error;

    return ((data || []) as CommentRow[]).map((item) => ({
      id: item.id,
      content: item.content,
      parent_id: item.parent_id,
      author_name: item.author_name,
      user_id: item.user_id,
      avatar_url: item.avatar_url,
      is_spoiler: item.is_spoiler,
      created_at: item.created_at,
      profiles: item.profiles || {
        level: 1,
        xp: 0,
        username: item.author_name,
        avatar_url: item.avatar_url,
      },
    }));
  },
  ["comments-v2"],
  { revalidate: COMMENTS_REVALIDATE_SECONDS, tags: ["comments"] },
);

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

  try {
    const comments = await getCachedComments(type, slug, chapter, sort, limit);
    const response = NextResponse.json(comments);
    response.headers.set(
      "Cache-Control",
      `public, s-maxage=${COMMENTS_REVALIDATE_SECONDS}, stale-while-revalidate=${COMMENTS_REVALIDATE_SECONDS}`,
    );
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Terjadi kesalahan" },
      { status: 500 },
    );
  }
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

    revalidateTag("comments", { expire: 0 });

    // ── Kirim notifikasi reply ─────────────────────────────────────
    if (parent_id && comment) {
      try {
        // Ambil komentar asli
        const { data: parentComment } = await supabaseAdmin
          .from("comments")
          .select("user_id, content")
          .eq("id", parent_id)
          .maybeSingle();

        if (parentComment?.user_id && parentComment.user_id !== user_id) {
          // Dapatkan subscription pemilik komentar asli
          const { data: subs } = await supabaseAdmin
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", parentComment.user_id);

          if (subs && subs.length > 0) {
            // Dynamic import web-push (server-side only)
            const webPush = await import("web-push");
            const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
            const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
            const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contact@ryukomik.web.id";

            if (vapidPublic && vapidPrivate) {
              webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

              const replyPreview = (content || "").substring(0, 80);
              const notifPayload = JSON.stringify({
                title: `${author_name || "Seseorang"} membalas komentar Anda`,
                body: replyPreview,
                tag: `reply:${parent_id}`,
                url: slug ? `/${type}/${slug}${chapter ? `/chapter/${chapter}` : ""}` : "/",
              });

              const sendPromises = subs.map((sub: any) => {
                try {
                  return webPush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    notifPayload,
                  );
                } catch (e) {
                  return Promise.resolve();
                }
              });
              await Promise.allSettled(sendPromises);
            }
          }
        }
      } catch (notifErr) {
        console.error("Gagal kirim notif reply:", notifErr);
      }
    }

    return NextResponse.json({ success: true, comment });
  } catch (err) {
    console.error("POST Error:", errorMessage(err));
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
