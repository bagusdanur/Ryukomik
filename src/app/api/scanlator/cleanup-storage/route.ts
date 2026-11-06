import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { targetById } from "@/lib/r2Targets";
import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hapus file di R2 yang tidak dipakai chapter mana pun (sisa upload gagal/retry).
 * Hanya menyentuh prefix milik tim yang login dan file yang berumur > 1 jam.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const profile = await socialQuery<{ handle: string; storage_handle: string | null; status: string }>(
      "select handle, storage_handle, status from scanlator_profiles where user_id = $1 limit 1",
      [userId],
    );
    const me = profile.rows[0];
    if (!me || me.status === "revoked") return NextResponse.json({ error: "Kamu belum Scanlator aktif." }, { status: 403 });

    const storage = me.storage_handle || me.handle;
    const target = targetById(undefined);

    // Semua URL gambar yang masih dipakai.
    const list = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>("/admin/projects?limit=100&page=1").catch(() => ({ data: [] }));
    const mine = (list.data || []).filter((m) => String((m as { owner_user_id?: string }).owner_user_id || "") === userId);

    const used = new Set<string>();
    for (const m of mine) {
      const slug = String((m as { slug?: string }).slug || "");
      if (!slug) continue;
      const chapters = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
        `/admin/chapters?manga_slug=${encodeURIComponent(slug)}&limit=200&page=1`,
      ).catch(() => ({ data: [] }));
      for (const c of chapters.data || []) {
        const rows = [
          ...((c as { image_urls?: string[] }).image_urls || []),
          ...((c as { pending_image_urls?: string[] }).pending_image_urls || []),
        ];
        for (const url of rows) if (typeof url === "string" && url) used.add(url);
      }
    }

    const prefix = `scanlator/${storage}/`;
    let token: string | undefined;
    const orphans: { Key: string; Size: number }[] = [];
    let totalFiles = 0;

    do {
      const page = await target.client.send(
        new ListObjectsV2Command({ Bucket: target.bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }),
      );
      for (const obj of page.Contents || []) {
        if (!obj.Key) continue;
        totalFiles += 1;
        const publicUrl = `${target.publicBase}/${obj.Key}`;
        if (used.has(publicUrl)) continue;
        const modified = obj.LastModified ? obj.LastModified.getTime() : 0;
        if (Date.now() - modified < 60 * 60 * 1000) continue; // jangan hapus upload yang sedang jalan
        orphans.push({ Key: obj.Key, Size: Number(obj.Size || 0) });
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);

    let deleted = 0;
    let freedBytes = 0;
    for (let i = 0; i < orphans.length; i += 1000) {
      const batch = orphans.slice(i, i + 1000);
      await target.client.send(
        new DeleteObjectsCommand({
          Bucket: target.bucket,
          Delete: { Objects: batch.map((o) => ({ Key: o.Key })), Quiet: true },
        }),
      );
      deleted += batch.length;
      freedBytes += batch.reduce((sum, o) => sum + o.Size, 0);
    }

    return NextResponse.json(
      {
        success: true,
        totalFiles,
        deleted,
        freedBytes,
        keptFiles: totalFiles - deleted,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[scanlator/cleanup] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal membersihkan storage." }, { status: 500 });
  }
}
