import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { Readable } from "node:stream";

import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Folder backup produksi di VPS (di luar repo). Daftar & download dibatasi
// pola nama file dump saja — tidak ada path lain yang bisa dibaca.
const BACKUP_DIR = "/home/ryukomik/backups/ryukomik-social";
const DUMP_PATTERN = /^social-\d{8}-\d{6}\.dump$/;

type BackupFile = {
  name: string;
  size: number;
  mtime: string;
};

async function readJsonFile(path: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function listBackups(): Promise<BackupFile[]> {
  let names: string[] = [];
  try {
    names = await readdir(BACKUP_DIR);
  } catch {
    return [];
  }
  const files: BackupFile[] = [];
  for (const name of names) {
    if (!DUMP_PATTERN.test(name)) continue;
    try {
      const info = await stat(join(BACKUP_DIR, name));
      if (info.isFile()) files.push({ name, size: info.size, mtime: info.mtime.toISOString() });
    } catch {
      // abaikan file yang hilang di tengah jalan
    }
  }
  return files.sort((a, b) => b.mtime.localeCompare(a.mtime));
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const url = new URL(request.url);
    const downloadName = url.searchParams.get("download");

    if (downloadName) {
      if (!DUMP_PATTERN.test(downloadName) || basename(downloadName) !== downloadName) {
        return NextResponse.json({ error: "Nama file tidak valid." }, { status: 400 });
      }
      const path = join(BACKUP_DIR, downloadName);
      try {
        const info = await stat(path);
        if (!info.isFile()) throw new Error("bukan file");
        const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
        return new NextResponse(stream, {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${downloadName}"`,
            "Content-Length": String(info.size),
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      } catch {
        return NextResponse.json({ error: "File backup tidak ditemukan." }, { status: 404 });
      }
    }

    const [files, offsite, restoreTest, dbSize, counts] = await Promise.all([
      listBackups(),
      readJsonFile(join(BACKUP_DIR, ".last-offsite.json")),
      readJsonFile(join(BACKUP_DIR, ".last-restore-test.json")),
      socialQuery<{ pretty: string; bytes: string }>("select pg_size_pretty(pg_database_size(current_database())) as pretty, pg_database_size(current_database())::text as bytes").catch(() => ({ rows: [] as Array<{ pretty: string; bytes: string }> })),
      socialQuery<{ profiles: string; auth_users: string; comments: string; user_backup: string }>(
        "select (select count(*)::text from social_profiles) as profiles, (select count(*)::text from auth_users) as auth_users, (select count(*)::text from comments) as comments, (select count(*)::text from user_backup) as user_backup",
      ).catch(() => ({ rows: [] as Array<{ profiles: string; auth_users: string; comments: string; user_backup: string }> })),
    ]);

    const latest = files[0] || null;
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    return NextResponse.json({
      success: true,
      retentionDays: 14,
      schedule: "Harian 03:20",
      dir: BACKUP_DIR,
      latest: latest ? { name: latest.name, size: latest.size, mtime: latest.mtime } : null,
      totalFiles: files.length,
      totalBytes,
      files: files.slice(0, 20),
      offsite: offsite || { ok: false, at: null, detail: "belum pernah upload offsite" },
      restoreTest: restoreTest || { ok: false, at: null, detail: "belum pernah diuji" },
      db: {
        sizePretty: dbSize.rows[0]?.pretty || null,
        sizeBytes: dbSize.rows[0]?.bytes ? Number(dbSize.rows[0].bytes) : null,
        counts: counts.rows[0]
          ? {
              profiles: Number(counts.rows[0].profiles),
              authUsers: Number(counts.rows[0].auth_users),
              comments: Number(counts.rows[0].comments),
              userBackup: Number(counts.rows[0].user_backup),
            }
          : null,
      },
    });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat status backup.");
  }
}
