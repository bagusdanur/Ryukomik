"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiDatabase, FiDownload, FiRefreshCw, FiShield, FiUploadCloud, FiXCircle } from "react-icons/fi";

type BackupFile = { name: string; size: number; mtime: string };
type OffsiteStatus = { ok?: boolean; at?: string | null; detail?: string };
type RestoreStatus = { ok?: boolean; at?: string | null; file?: string; profiles?: number; auth_users?: number; comments?: number; user_backup?: number; detail?: string };
type BackupData = {
  success: boolean;
  retentionDays: number;
  schedule: string;
  latest: { name: string; size: number; mtime: string } | null;
  totalFiles: number;
  totalBytes: number;
  files: BackupFile[];
  offsite: OffsiteStatus;
  restoreTest: RestoreStatus;
  db: {
    sizePretty: string | null;
    sizeBytes: number | null;
    counts: { profiles: number; authUsers: number; comments: number; userBackup: number } | null;
  };
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return "belum ada";
  return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Halaman admin Backup: kondisi backup lokal + offsite, daftar dump, unduhan. */
export default function BackupTab({ getAdminToken }: { getAdminToken: () => Promise<string> }) {
  const [data, setData] = useState<BackupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAdminToken();
      const response = await fetch("/api/admin/backups", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.ok) setData((await response.json()) as BackupData);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [getAdminToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const download = async (name: string) => {
    setDownloading(name);
    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/backups?download=${encodeURIComponent(name)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  const offsite = data?.offsite;
  const restore = data?.restoreTest;
  const counts = data?.db.counts;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[.06] bg-[#13131a] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7c5cfc]/15 text-[#a997ff]">
              <FiDatabase size={17} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">Backup Database Sosial</p>
              <p className="mt-0.5 text-[11px] text-white/35">
                {data ? `Jadwal ${data.schedule} · retensi ${data.retentionDays} hari · ${data.totalFiles} file (${formatBytes(data.totalBytes)})` : "Memuat…"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Muat ulang status backup"
            className="rounded-lg border border-white/10 p-2 text-white/40 transition hover:text-white"
          >
            <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-white/30">Backup terakhir</p>
            <p className="mt-0.5 text-sm font-bold text-white">{data?.latest ? formatTime(data.latest.mtime) : "—"}</p>
          </div>
          <div className="rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-white/30">Ukuran DB live</p>
            <p className="mt-0.5 text-sm font-bold text-white">{data?.db.sizePretty || "—"}</p>
          </div>
          <div className="rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-white/30">Profil</p>
            <p className="mt-0.5 text-sm font-bold text-white">{counts ? counts.profiles.toLocaleString("id-ID") : "—"}</p>
          </div>
          <div className="rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-white/30">Akun login</p>
            <p className="mt-0.5 text-sm font-bold text-white">{counts ? counts.authUsers.toLocaleString("id-ID") : "—"}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${offsite?.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
            {offsite?.ok ? <FiCheckCircle size={11} /> : <FiXCircle size={11} />}
            <FiUploadCloud size={11} />
            Offsite R2 terenkripsi{offsite?.at ? ` · ${formatTime(offsite.at)}` : ""}
          </span>
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${restore?.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
            {restore?.ok ? <FiCheckCircle size={11} /> : <FiClock size={11} />}
            Uji restore{restore?.ok ? ` · ${restore.profiles?.toLocaleString("id-ID")} profil pulih` : ""}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/[.04] px-2.5 py-1 text-white/40">
            <FiShield size={11} />
            File dump mode 600
          </span>
        </div>

        {offsite?.detail && !offsite.ok && <p className="mt-2 text-[11px] text-rose-300/80">{String(offsite.detail).slice(0, 160)}</p>}
      </div>

      <div className="rounded-2xl border border-white/[.06] bg-[#13131a] p-4">
        <p className="text-[13px] font-bold text-white">Daftar backup</p>
        <p className="mt-0.5 text-[11px] text-white/35">Unduhan hanya untuk admin. File berisi data user — jangan dibagikan.</p>
        <div className="mt-3 divide-y divide-white/[.04]">
          {(data?.files || []).map((file) => (
            <div key={file.name} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white/85">{file.name}</p>
                <p className="text-[10px] text-white/35">{formatBytes(file.size)} · {formatTime(file.mtime)}</p>
              </div>
              <button
                type="button"
                onClick={() => void download(file.name)}
                disabled={downloading === file.name}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/70 transition hover:text-white disabled:opacity-50"
              >
                <FiDownload size={12} />
                {downloading === file.name ? "Mengunduh…" : "Unduh"}
              </button>
            </div>
          ))}
          {data && data.files.length === 0 && <p className="py-4 text-center text-xs text-white/35">Belum ada file backup.</p>}
        </div>
      </div>
    </div>
  );
}
