import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminApi";
import { supabaseAdmin } from "@/lib/supabaseServer";

type ReadActivityRow = {
  user_id?: string | null;
  chapter_slug?: string | null;
};

type ProfileRow = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
};

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const [
    { count: totalUsers },
    { count: premiumUsers },
    { count: commentsToday },
    { count: totalComments },
    { count: readsToday },
    { data: totalReads },
    { count: pendingRequests },
    { data: readRows },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_premium", true),
    supabaseAdmin
      .from("comments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayISO),
    supabaseAdmin.from("comments").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("user_reads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayISO),
    supabaseAdmin.rpc("get_total_read_count"),
    supabaseAdmin
      .from("premium_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("user_reads")
      .select("user_id, chapter_slug")
      .gte("created_at", todayISO)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const reads = (readRows || []) as ReadActivityRow[];
  const userIds = Array.from(new Set(reads.map((read) => read.user_id).filter(Boolean))) as string[];
  const { data: profiles } = userIds.length
    ? await supabaseAdmin.from("profiles").select("id, username, avatar_url").in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((profile: ProfileRow) => [profile.id, profile]));
  const chapterCounts = new Map<string, number>();
  const userCounts = new Map<string, number>();

  for (const read of reads) {
    if (!read.chapter_slug || !read.user_id) continue;
    chapterCounts.set(read.chapter_slug, (chapterCounts.get(read.chapter_slug) || 0) + 1);
    userCounts.set(read.user_id, (userCounts.get(read.user_id) || 0) + 1);
  }

  const response = NextResponse.json({
    stats: {
      totalUsers: totalUsers ?? 0,
      premiumUsers: premiumUsers ?? 0,
      commentsToday: commentsToday ?? 0,
      totalComments: totalComments ?? 0,
      readsToday: readsToday ?? 0,
      totalReads: Number(totalReads || 0),
    },
    pendingCount: pendingRequests ?? 0,
    activityToday: {
      recent: [],
      topChapters: Array.from(chapterCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([slug, count]) => ({ slug, count })),
      topUsers: Array.from(userCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId, count]) => ({
          userId,
          count,
          profile: profileMap.get(userId) || null,
        })),
    },
  });

  response.headers.set("Cache-Control", "private, max-age=30");
  return response;
}
