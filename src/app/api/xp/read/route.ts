import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { recordMarathonReads } from "@/lib/marathon/repository";
import { recordReads } from "@/lib/social/xp";
import { checkReadRate, filterSeenSlugs, filterValidSlugs } from "@/lib/social/readGuard";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as { chapter_slugs?: unknown } | null;
    const chapterSlugs = Array.isArray(body?.chapter_slugs)
      ? [...new Set(body.chapter_slugs.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean))].slice(0, 20)
      : [];
    if (!chapterSlugs.length) return NextResponse.json({ error: "invalid" }, { status: 400 });

    // Tolak slug karangan sebelum menyentuh hitungan maraton/XP.
    const validSlugs = filterValidSlugs(chapterSlugs);
    if (!validSlugs.length) {
      return NextResponse.json({ error: "invalid_chapter" }, { status: 400 });
    }

    const rate = await checkReadRate(userId);
    if (!rate.ok) {
      return NextResponse.json(
        { error: rate.reason, retry_after: rate.retryAfter },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? 600) } },
      );
    }

    // Hanya chapter yang benar-benar pernah dibuka lewat reader yang dihitung.
    const seenSlugs = await filterSeenSlugs(validSlugs);
    if (!seenSlugs.length) {
      return NextResponse.json({ error: "unknown_chapter" }, { status: 422 });
    }
    chapterSlugs.splice(0, chapterSlugs.length, ...seenSlugs);

    // XP + riwayat baca ditulis ke database lokal (irisan 3): idempoten lewat
    // primary key (user_id, chapter_slug), jadi chapter yang sama tidak dihitung ulang.
    const { recorded, xpAdded } = await recordReads(userId, chapterSlugs, 5);

    // Event Marathon Baca (database lokal). Sengaja tidak di-await dan semua
    // error ditelan: tracking XP tidak boleh gagal karena DB event bermasalah.
    if (recorded > 0) {
      void recordMarathonReads(userId, chapterSlugs).catch((e) =>
        console.error("[marathon] record failed:", e instanceof Error ? e.message : e),
      );
    }

    return NextResponse.json({ success: true, recorded_count: recorded, xp_added: xpAdded });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    if (!unauthorized) console.error("[XP Read Batch] Error:", error);
    return NextResponse.json({ error: unauthorized ? "unauthorized" : "failed" }, { status: unauthorized ? 401 : 500 });
  }
}
