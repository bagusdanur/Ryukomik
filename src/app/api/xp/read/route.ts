import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { recordMarathonReads } from "@/lib/marathon/repository";
import { recordReads } from "@/lib/social/xp";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as { chapter_slugs?: unknown } | null;
    const chapterSlugs = Array.isArray(body?.chapter_slugs)
      ? [...new Set(body.chapter_slugs.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean))].slice(0, 20)
      : [];
    if (!chapterSlugs.length) return NextResponse.json({ error: "invalid" }, { status: 400 });

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
