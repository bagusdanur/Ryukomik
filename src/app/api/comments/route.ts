import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getSocialProfiles } from "@/lib/social/profileLookup";
import { addXp } from "@/lib/social/xp";
import { createSocialNotification } from "@/lib/social/notifications";
import { verifyAdminRequest, adminErrorResponse } from "@/lib/adminApi";
import { requireUserId } from "@/lib/social/auth";
import { resolveActorUserId } from "@/lib/requestAuthPolicy";

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

// Komentar baru langsung membatalkan cache manga/chapter terkait lewat
// invalidateComments di POST — bukan revalidateTag global yang menghapus cache
// semua manga sekaligus.
// s-maxage edge/HTTP: tetap 30 menit supaya komentar baru cepat terlihat
// antar-pengunjung (edge selalu punya salinan segar tiap 30 menit).
const COMMENTS_REVALIDATE_SECONDS = 1800;
// TTL memori origin: sengaja jauh lebih panjang. Aman karena di-invalidasi
// per-(slug,chapter) tiap komentar baru masuk (POST) dan tiap moderasi menghapus
// komentar (DELETE di bawah) — jadi query Supabase hanya terjadi kalau memang
// ada perubahan, bukan tiap 30 menit untuk manga yang sepi.
const COMMENTS_MEMORY_TTL_SECONDS = 6 * 60 * 60;

// In-memory per-(type, slug, chapter) cache. Server ini single instance (pm2),
// jadi Map cukup. unstable_cache tidak bisa dipakai karena tag-nya statis: satu
// komentar baru di manga A dulu menghapus cache semua manga (query comments bolak
// -balik ke Supabase tiap komentar masuk). Cache per-slug + invalidasi per-slug
// menghilangkan itu.
type CommentsPayload = unknown[];
const commentsCache = new Map<string, { at: number; data: CommentsPayload }>();
const commentsRequests = new Map<string, Promise<CommentsPayload>>();

function commentsPrefix(type: string, slug: string | null, chapter: string | null) {
  return `${type}\u0000${slug || ""}\u0000${chapter || ""}\u0000`;
}

function commentsKey(type: string, slug: string | null, chapter: string | null, sort: string, limit: number) {
  return `${commentsPrefix(type, slug, chapter)}${sort}\u0000${limit}`;
}

// Hapus hanya cache yang berhubungan dengan manga/chapter ini (semua sort/limit).
function invalidateComments(type: string, slug: string | null, chapter: string | null) {
  const prefix = commentsPrefix(type, slug, chapter);
  for (const key of [...commentsCache.keys()]) {
    if (key.startsWith(prefix)) commentsCache.delete(key);
  }
  for (const key of [...commentsRequests.keys()]) {
    if (key.startsWith(prefix)) commentsRequests.delete(key);
  }
}

async function fetchComments(
  type: string,
  slug: string | null,
  chapter: string | null,
  sort: string,
  limit: number,
): Promise<CommentsPayload> {
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
        created_at
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

  const rows = (data || []) as CommentRow[];
  // Data penulis diambil dari PostgreSQL lokal (satu query batch), bukan join
  // ke tabel profiles Supabase — payload komentar lebih kecil, nol egress.
  const people = await getSocialProfiles(rows.map((item) => (item.user_id ? String(item.user_id) : null)));

  return rows.map((item) => {
    const person = item.user_id ? people.get(String(item.user_id)) : undefined;
    const username = person?.username || item.author_name;
    const avatar = person?.avatar_url || item.avatar_url;
    return {
      id: item.id,
      content: item.content,
      parent_id: item.parent_id,
      author_name: item.author_name,
      user_id: item.user_id,
      avatar_url: item.avatar_url,
      is_spoiler: item.is_spoiler,
      created_at: item.created_at,
      avatar_border: person?.avatar_border ?? null,
      profiles: {
        level: person?.level ?? 1,
        xp: person?.xp ?? 0,
        username,
        avatar_url: avatar,
        role: person?.role ?? null,
        is_premium: person?.is_premium ?? false,
        total_reads: person?.total_reads ?? 0,
        avatar_border: person?.avatar_border ?? null,
      },
    };
  });
}

function getCachedComments(
  type: string,
  slug: string | null,
  chapter: string | null,
  sort: string,
  limit: number,
): Promise<CommentsPayload> {
  const key = commentsKey(type, slug, chapter, sort, limit);
  const now = Date.now();
  const cached = commentsCache.get(key);
  if (cached && now - cached.at < COMMENTS_MEMORY_TTL_SECONDS * 1000) {
    return Promise.resolve(cached.data);
  }

  const pending = commentsRequests.get(key);
  if (pending) return pending;

  const request = fetchComments(type, slug, chapter, sort, limit)
    .then((data) => {
      commentsCache.set(key, { at: Date.now(), data });
      commentsRequests.delete(key);
      return data;
    })
    .catch((error) => {
      commentsRequests.delete(key);
      throw error;
    });
  commentsRequests.set(key, request);
  return request;
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

// Moderasi: hapus komentar lewat server supaya cache per-slug + tag ikut
// di-invalidasi. Hapus langsung dari browser (lama) tidak menyentuh cache ini,
// sehingga dengan TTL memori 6 jam komentar hasil moderasi bisa basi lama.
export async function DELETE(req: NextRequest) {
  const guard = await verifyAdminRequest(req);
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  try {
    const body = (await req.json().catch(() => null)) as { id?: string } | null;
    const id = body?.id;
    if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

    const { data: row } = await supabaseAdmin
      .from("comments")
      .select("id, type, slug, chapter")
      .eq("id", id)
      .maybeSingle();
    if (!row) {
      return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });
    }

    const { error: delError } = await supabaseAdmin.from("comments").delete().eq("id", id);
    if (delError) throw delError;

    invalidateComments(
      String(row.type || "komik"),
      (row.slug as string | null) ?? null,
      (row.chapter as string | null) ?? null,
    );
    revalidateTag("comments", { expire: 0 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminErrorResponse(error, "Gagal menghapus komentar");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateCommentBody;
    const { type, slug, chapter, content, parent_id, author_name, avatar_url,is_spoiler } = body;

    // The author is the verified token subject. A body-supplied user_id used to
    // be trusted, which let anyone post as another user.
    let tokenUserId: string | null = null;
    let banned = false;
    try {
      tokenUserId = await requireUserId(req);
    } catch (error) {
      banned = error instanceof Error && error.message === "BANNED";
      tokenUserId = null;
    }

    if (banned) {
      return NextResponse.json({ error: "Akun kamu diblokir." }, { status: 403 });
    }

    const user_id = resolveActorUserId(tokenUserId);

    if (!user_id) {
      return NextResponse.json(
        { error: "Harus login dulu" },
        { status: 401 }
      );
    }

    if (!type || !content) {
      return NextResponse.json({ error: "Konten atau Type kosong" }, { status: 400 });
    }

    // Identitas penulis dari database lokal (nol query Supabase tambahan).
    const people = await getSocialProfiles([user_id]);
    const profile = people.get(user_id);

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
  
  // XP ditulis ke database lokal (irisan 3), bukan RPC Supabase.
  await addXp(user_id, xpGain).catch((error) =>
    console.error("Gagal tambah XP:", error instanceof Error ? error.message : error),
  );
}

    // Invalidate hanya cache manga/chapter ini, lalu refresh daftar global
    // (LatestComments + halaman komentar) yang memang harus menampilkan komentar
    // baru dari manga apa pun.
    invalidateComments(type, slug, chapter);
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
          await createSocialNotification({
            userId: parentComment.user_id,
            actorId: user_id,
            actorName: profile?.username || author_name || "Member",
            type: "reply",
            slug: slug || null,
            chapter: chapter || null,
            targetId: parent_id,
          });

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
