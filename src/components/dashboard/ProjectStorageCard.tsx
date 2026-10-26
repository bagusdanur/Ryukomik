"use client";

import { useCallback, useEffect, useState } from "react";
import { FiHardDrive, FiRefreshCw } from "react-icons/fi";

type BucketUsage = {
  id: string;
  bucket: string;
  publicBase: string;
  usedBytes: number;
  freeBytes: number;
  objectCount: number;
  percentUsed: number;
};

type Usage = {
  bucket: string;
  usedBytes: number;
  freeBytes: number;
  limitBytes: number;
  objectCount: number;
  percentUsed: number;
  buckets?: BucketUsage[];
  scannedAt: string;
};

/** Desimal (1 KB = 1000 B) supaya sebanding dengan dashboard Cloudflare. */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1000)));
  const value = bytes / 1000 ** index;
  return `${value.toFixed(value >= 100 || index <= 1 ? 0 : 1)} ${units[index]}`;
}

/**
 * Indikator pemakaian R2 untuk Project: terpakai vs kuota gratis 10 GB.
 * Sumber: /api/admin/project/storage-usage (listing bucket, cache 10 menit).
 */
export default function ProjectStorageCard({
  getAdminToken,
}: {
  getAdminToken: () => Promise<string>;
}) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setError("");
      try {
        const token = await getAdminToken();
        const res = await fetch(`/api/admin/project/storage-usage${force ? "?refresh=1" : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        setUsage(json as Usage);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat pemakaian R2.");
      } finally {
        setLoading(false);
      }
    },
    [getAdminToken],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const percent = Math.min(100, Math.max(0, usage?.percentUsed ?? 0));
  const barColor =
    percent >= 90 ? "bg-rose-500" : percent >= 70 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div className="rounded-2xl border border-white/[.07] bg-[#13131a] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FiHardDrive className="text-emerald-300" />
          <div>
            <p className="text-sm font-black">Penyimpanan R2</p>
            <p className="text-[10px] text-white/40">
              Gambar chapter &amp; cover — kuota gratis 10 GB
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-3 py-1.5 text-[11px] font-bold text-white/60 transition hover:bg-white/[.08] disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} size={12} />
          {loading ? "Menghitung..." : "Hitung ulang"}
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </p>
      ) : !usage ? (
        <div className="h-9 animate-pulse rounded-xl bg-white/[.05]" />
      ) : (
        <>
          {usage.buckets && usage.buckets.length > 1 ? (
            <div className="space-y-3">
              {usage.buckets.map((item) => {
                const itemPercent = Math.min(100, Math.max(0, item.percentUsed));
                const itemColor =
                  itemPercent >= 90 ? "bg-rose-500" : itemPercent >= 70 ? "bg-amber-400" : "bg-emerald-400";
                return (
                  <div key={item.id}>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-sm font-black leading-none">
                          {formatBytes(item.usedBytes)}
                          <span className="text-[11px] font-bold text-white/40"> / {formatBytes(usage.limitBytes)}</span>
                        </p>
                        <p className="mt-1 text-[10px] text-white/40">
                          {item.id === "primary" ? "Akun 1" : "Akun 2"} · {new URL(item.publicBase).hostname} ·{" "}
                          {item.objectCount.toLocaleString("id-ID")} file
                          {item.usedBytes > usage.limitBytes ? (
                            <span className="font-bold text-rose-300"> · lewat {formatBytes(item.usedBytes - usage.limitBytes)}</span>
                          ) : (
                            <span className="text-emerald-300/80"> · sisa {formatBytes(item.freeBytes)}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs font-black tabular-nums text-white/70">{itemPercent.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[.07]">
                      <div className={`h-full rounded-full ${itemColor}`} style={{ width: `${itemPercent}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-white/30">
                Total {formatBytes(usage.usedBytes)} · {usage.objectCount.toLocaleString("id-ID")} file · dihitung{" "}
                {new Date(usage.scannedAt).toLocaleTimeString("id-ID")} (cache 10 menit)
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-lg font-black leading-none">
                    {formatBytes(usage.usedBytes)}
                    <span className="text-xs font-bold text-white/40"> / {formatBytes(usage.limitBytes)}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-white/45">
                    {usage.usedBytes > usage.limitBytes ? (
                      <span className="font-bold text-rose-300">
                        Lewat kuota {formatBytes(usage.usedBytes - usage.limitBytes)}
                      </span>
                    ) : (
                      <>
                        Sisa <span className="font-bold text-emerald-300">{formatBytes(usage.freeBytes)}</span>
                      </>
                    )}
                    {" · "}{usage.objectCount.toLocaleString("id-ID")} file
                  </p>
                </div>
                <span className="text-sm font-black tabular-nums text-white/70">{percent.toFixed(1)}%</span>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[.07]">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
              </div>

              <p className="mt-2 text-[10px] text-white/30">
                Bucket <span className="font-mono">{usage.bucket}</span> · dihitung{" "}
                {new Date(usage.scannedAt).toLocaleTimeString("id-ID")} (cache 10 menit)
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
