import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { socialQuery, socialTransaction } from "@/lib/social/db";
import { getSocialProfiles } from "@/lib/social/profileLookup";
import { addXp } from "@/lib/social/xp";
import { createSocialNotification } from "@/lib/social/notifications";
import { verifyAdminRequest, adminErrorResponse } from "@/lib/adminApi";
import { requireUserId } from "@/lib/social/auth";
import { resolveActorUserId } from "@/lib/requestAuthPolicy";

/**
 * Komentar sekarang dibaca/ditulis dari Postgres lokal (`comments`), bukan
 * Supabase lagi. Supabase tetap utuh sebagai cadangan rollback.
 *
 * Aturan fitur:
 * - Balas balasan: balasan baru ditempel ke komentar UTAMA dan diberi `@nama`,
 *   supaya thread tetap 2 tingkat dan tidak ada balasan yang hilang.
 * - Hapus: pemilik atau admin. Kalau sudah punya balasan → soft delete
 *   (`[dihapus]`) agar thread tidak rusak.
 * - Edit: pemilik dalam 15 menit (maks 3x) atau admin kapan saja; versi lama
 *   dicatat di `comment_edits`.
 */

type CommentRow = {
  id: string | number;
  type?: string | null;
  slug?: string | null;
  chapter?: string | null;
  content: string;
  parent_id: string | number | null;
  author_name: string | null;
  user_id: string | null;
  avatar_url: string | null;
  is_spoiler: boolean;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type CreateCommentBody = {
  type?: string;
  slug?: string;
  chapter?: string;
  content?: string;
  parent_id?: string | number;
  author_name?: string;
  avatar_url?: string;
  is_spoiler?: boolean;
};

const COMMENTS_REVALIDATE_SECONDS = 1800;
const COMMENTS_MEMORY_TTL_SECONDS = 6 * 60 * 60;
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_EDITS = 3;
const MAX_CONTENT = 2000;

const commentsCache = new Map<string, { at: number; data: unknown[] }>();
const commentsRequests = new Map<string, Promise<unknown[]>>();

function commentsPrefix(type: string, slug: string | null, chapter: string | null) {
  return `${type}\u0000${slug || ""}\u0000${chapter || ""}\u0000`;
}

function commentsKey(type: string, slug: string | null, chapter: string | null, sort: string, limit: number) {
  return `${commentsPrefix(type, slug, chapter)}${sort}\u0000${limit}`;
}

function invalidateComments(type: string, slug: string | null, chapter: string | null) {
  const prefix = commentsPrefix(type, slug, chapter);
  for (const key of [...commentsCache.keys()]) {
    if (key.startsWith(prefix)) commentsCache.delete(key);
  }
  for (const key of [...commentsRequests.keys()]) {
    if (key.startsWith(prefix)) commentsRequests.delete(key);
  }
}

const num = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));

async function fetchComments(
  type: string,
  slug: string | null,
  chapter: string | null,
  sort: string,
  limit: number,
): Promise<unknown[]> {
  const conditions: string[] = ["type = $1"];
  const values: unknown[] = [type];
  if (slug) {
    values.push(slug);
    conditions.push(`slug = $${values.length}`);
  }
  if (chapter) {
    values.push(chapter);
    conditions.push(`chapter = $${values.length}`);
  } else {
    conditions.push("chapter is null");
  }
  values.push(limit);

  const { rows } = await socialQuery<CommentRow>(
    `select id, content, parent_id, author_name, user_id, avatar_url, is_spoiler,
            created_at, edited_at, deleted_at
       from comments
      where ${conditions.join(" and ")}
      order by created_at ${sort === "old" ? "asc" : "desc"}
      limit $${values.length}`,
    values,
  );

  // Data penulis dari Postgres lokal (satu query batch), bukan Supabase.
  const people = await getSocialProfiles(rows.map((item) => (item.user_id ? String(item.user_id) : null)));

  return rows.map((item) => {
    const person = item.user_id ? people.get(String(item.user_id)) : undefined;
    const username = person?.username || item.author_name;
    const avatar = person?.avatar_url || item.avatar_url;
    return {
      id: num(item.id),
      content: item.content,
      parent_id: num(item.parent_id),
      author_name: item.author_name,
      user_id: item.user_id,
      avatar_url: item.avatar_url,
      is_spoiler: item.is_spoiler,
      created_at: item.created_at,
      edited_at: item.edited_at,
      deleted_at: item.deleted_at,
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
): Promise<unknown[]> {
  const key = commentsKey(type, slug, chapter, sort, limit);
  const cached = commentsCache.get(key);
  if (cached && Date.now() - cached.at < COMMENTS_MEMORY_TTL_SECONDS * 1000) {
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

async function recountAuthor(userId: string | null) {
  if (!userId) return;
  await socialQuery(
    `update social_profiles
        set total_comments = (select count(*) from comments where user_id = $1 and deleted_at is null)
      where user_id = $1`,
    [userId],
  ).catch((error) => console.error("recount komentar gagal:", error));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "komik";
  const slug = url.searchParams.get("slug");
  const chapter = url.searchParams.get("chapter");
  const sort = url.searchParams.get("sort") || "new";
  const requestedLimit = parseInt(url.searchParams.get("limit") || "20", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 20;

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

export async function DELETE(req: NextRequest) {
  let userId: string | null = null;
  try {
    userId = await requireUserId(req);
  } catch (error) {
    if (error instanceof Error && error.message === "BANNED") {
      return NextResponse.json({ error: "Akun kamu diblokir." }, { status: 403 });
    }
  }

  const admin = await verifyAdminRequest(req);
  const isAdmin = !("error" in admin);
  if (!userId && !isAdmin) {
    return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => null)) as { id?: string | number } | null;
    const id = Number(body?.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "id wajib" }, { status: 400 });

    const { rows } = await socialQuery<CommentRow>(
      "select id, type, slug, chapter, user_id from comments where id = $1",
      [id],
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });

    const isOwner = Boolean(userId && row.user_id && String(row.user_id) === userId);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Tidak berhak menghapus komentar ini." }, { status: 403 });
    }

    const replies = await socialQuery<{ n: number }>(
      "select count(*)::int n from comments where parent_id = $1 and deleted_at is null",
      [id],
    );

    if (replies.rows[0].n > 0) {
      await socialQuery(
        `update comments
            set content = '[dihapus]', author_name = null, avatar_url = null,
                user_id = null, deleted_at = now(), deleted_by = $2
          where id = $1`,
        [id, userId],
      );
    } else {
      await socialQuery("delete from comments where id = $1", [id]);
    }

    invalidateComments(String(row.type || "komik"), row.slug ?? null, row.chapter ?? null);
    revalidateTag("comments", { expire: 0 });
    await recountAuthor(row.user_id);
    return NextResponse.json({ success: true, soft: replies.rows[0].n > 0 });
  } catch (error) {
    return adminErrorResponse(error, "Gagal menghapus komentar");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const admin = await verifyAdminRequest(req);
    const isAdmin = !("error" in admin);

    const body = (await req.json().catch(() => null)) as
      | { id?: string | number; content?: string; is_spoiler?: boolean }
      | null;
    const id = Number(body?.id);
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!Number.isFinite(id)) return NextResponse.json({ error: "id wajib" }, { status: 400 });
    if (!content) return NextResponse.json({ error: "Komentar tidak boleh kosong." }, { status: 400 });
    if (content.length > MAX_CONTENT) {
      return NextResponse.json({ error: `Komentar maksimal ${MAX_CONTENT} karakter.` }, { status: 400 });
    }

    const { rows } = await socialQuery<CommentRow>(
      "select id, type, slug, chapter, user_id, content, is_spoiler, created_at, edit_count, deleted_at from comments where id = $1",
      [id],
    );
    const row = rows[0] as (CommentRow & { edit_count?: number }) | undefined;
    if (!row) return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });
    if (row.deleted_at) return NextResponse.json({ error: "Komentar sudah dihapus." }, { status: 400 });

    const isOwner = Boolean(row.user_id && String(row.user_id) === userId);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Tidak berhak mengedit komentar ini." }, { status: 403 });
    }
    if (!isAdmin) {
      const age = Date.now() - Date.parse(row.created_at);
      if (age > EDIT_WINDOW_MS) {
        return NextResponse.json({ error: "Batas waktu edit (15 menit) sudah lewat." }, { status: 403 });
      }
      if ((row.edit_count || 0) >= MAX_EDITS) {
        return NextResponse.json({ error: `Maksimal ${MAX_EDITS}x edit per komentar.` }, { status: 403 });
      }
    }

    const updated = await socialTransaction(async (client) => {
      await client.query(
        `insert into comment_edits (comment_id, previous_content, previous_is_spoiler, edited_by)
         values ($1, $2, $3, $4)`,
        [id, row.content, row.is_spoiler, userId],
      );
      const result = await client.query<CommentRow>(
        `update comments
            set content = $2, is_spoiler = $3, edited_at = now(), edit_count = edit_count + 1
          where id = $1
          returning id, content, parent_id, author_name, user_id, avatar_url, is_spoiler, created_at, edited_at, deleted_at`,
        [id, content, body?.is_spoiler ?? row.is_spoiler],
      );
      return result.rows[0];
    });

    invalidateComments(String(row.type || "komik"), row.slug ?? null, row.chapter ?? null);
    revalidateTag("comments", { expire: 0 });
    return NextResponse.json({ success: true, comment: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
    }
    return adminErrorResponse(error, "Gagal mengedit komentar");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateCommentBody;
    const { type, slug, chapter, content, parent_id, author_name, avatar_url, is_spoiler } = body;

    let tokenUserId: string | null = null;
    let banned = false;
    try {
      tokenUserId = await requireUserId(req);
    } catch (error) {
      banned = error instanceof Error && error.message === "BANNED";
    }
    if (banned) return NextResponse.json({ error: "Akun kamu diblokir." }, { status: 403 });

    const user_id = resolveActorUserId(tokenUserId);
    if (!user_id) return NextResponse.json({ error: "Harus login dulu" }, { status: 401 });
    if (!type || !content) return NextResponse.json({ error: "Konten atau Type kosong" }, { status: 400 });

    const people = await getSocialProfiles([user_id]);
    const profile = people.get(user_id);

    // Balasan-ke-balasan: tempel ke komentar utama + mention penulis aslinya,
    // supaya thread tetap 2 tingkat dan balasan tidak "hilang" dari UI.
    let parentId = parent_id ? Number(parent_id) : null;
    let replyToUserId: string | null = null;
    let replyToId: number | null = null;
    let mention = "";

    if (parentId && Number.isFinite(parentId)) {
      const parent = await socialQuery<{ id: string; parent_id: string | null; author_name: string | null; user_id: string | null }>(
        "select id, parent_id, author_name, user_id from comments where id = $1 and deleted_at is null",
        [parentId],
      );
      const row = parent.rows[0];
      if (!row) {
        parentId = null;
      } else {
        replyToId = Number(row.id);
        replyToUserId = row.user_id;
        if (row.parent_id) parentId = Number(row.parent_id);
        if (row.author_name) mention = `@${row.author_name} `;
      }
    } else {
      parentId = null;
    }

    const finalContent = `${mention}${content}`.slice(0, MAX_CONTENT);

    const inserted = await socialQuery<CommentRow>(
      `insert into comments (id, type, slug, chapter, content, parent_id, author_name, user_id, avatar_url, is_spoiler)
       values (nextval('comments_id_seq'), $1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id, type, slug, chapter, content, parent_id, author_name, user_id, avatar_url, is_spoiler, created_at, edited_at, deleted_at`,
      [
        type,
        slug || null,
        chapter || null,
        finalContent,
        parentId,
        profile?.username || author_name || "Anonim",
        user_id,
        profile?.avatar_url || avatar_url || null,
        Boolean(is_spoiler),
      ],
    );
    const comment = inserted.rows[0];

    await addXp(user_id, parentId ? 5 : 10).catch((error) =>
      console.error("Gagal tambah XP:", error instanceof Error ? error.message : error),
    );
    await recountAuthor(user_id);

    invalidateComments(type, slug ?? null, chapter ?? null);
    revalidateTag("comments", { expire: 0 });

    // Notifikasi balasan ke penulis komentar yang dibalas (bukan ke root).
    if (replyToId && replyToUserId && replyToUserId !== user_id) {
      try {
        await createSocialNotification({
          userId: replyToUserId,
          actorId: user_id,
          actorName: profile?.username || author_name || "Member",
          type: "reply",
          slug: slug || null,
          chapter: chapter || null,
          targetId: String(replyToId),
        });

        // Push subscription masih disimpan di Supabase (tidak dimigrasikan).
        const { supabaseAdmin } = await import("@/lib/supabaseServer");
        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", replyToUserId);

        if (subs && subs.length > 0) {
          const webPush = await import("web-push");
          const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
          const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
          const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contact@ryukomik.web.id";
          if (vapidPublic && vapidPrivate) {
            webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
            const notifPayload = JSON.stringify({
              title: `${profile?.username || author_name || "Seseorang"} membalas komentar Anda`,
              body: (content || "").substring(0, 80),
              tag: `reply:${replyToId}`,
              url: slug ? `/${type}/${slug}${chapter ? `/chapter/${chapter}` : ""}` : "/",
            });
            await Promise.allSettled(
              subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
                webPush
                  .sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    notifPayload,
                  )
                  .catch(() => undefined),
              ),
            );
          }
        }
      } catch (notifErr) {
        console.error("Gagal kirim notif reply:", notifErr);
      }
    }

    return NextResponse.json({ success: true, comment });
  } catch (err) {
    console.error("POST Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Terjadi kesalahan" }, { status: 500 });
  }
}
