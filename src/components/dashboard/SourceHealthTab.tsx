"use client";

import { FiRefreshCw } from "react-icons/fi";

type SourceHealthItem = {
  id: string;
  label: string;
  ok?: boolean;
  imageProxy?: "always" | "fallback" | string;
  status?: string | number;
  latencyMs?: number;
  itemCount?: number;
  empty?: boolean;
  error?: string;
  endpoint: string;
};

type SourceHealth = {
  degraded?: number;
  checkedAt?: string;
  error?: string;
  sources?: SourceHealthItem[];
};

type SourceHealthTabProps = {
  sourceHealth?: SourceHealth | null;
  sourceHealthLoading: boolean;
  healthNotice?: string;
  imageProxyTestUrl: string;
  setImageProxyTestUrl: (value: string) => void;
  cacheSourcePath: string;
  setCacheSourcePath: (value: string) => void;
  chapterRefreshPath: string;
  setChapterRefreshPath: (value: string) => void;
  chapterRefreshLoading: boolean;
  fetchSourceHealth: () => void;
  copyHealthReport: () => void;
  openImageProxyTest: () => void;
  openCacheSourceTest: () => void;
  refreshChapterCache: () => void;
  openSourceEndpoint: (endpoint: string) => void;
  copyText: (text: string, notice?: string) => void;
};

function timeAgo(dateStr?: string) {
  if (!dateStr) return "-";

  let ds = dateStr;
  if (typeof ds === "string" && !ds.endsWith("Z") && !ds.includes("+")) {
    ds = ds.replace(" ", "T") + "Z";
  }

  const date = new Date(ds);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}h lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function SourceHealthTab({
  sourceHealth,
  sourceHealthLoading,
  healthNotice,
  imageProxyTestUrl,
  setImageProxyTestUrl,
  cacheSourcePath,
  setCacheSourcePath,
  chapterRefreshPath,
  setChapterRefreshPath,
  chapterRefreshLoading,
  fetchSourceHealth,
  copyHealthReport,
  openImageProxyTest,
  openCacheSourceTest,
  refreshChapterCache,
  openSourceEndpoint,
  copyText,
}: SourceHealthTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-[15px] font-bold text-white">Source Health</p>
          <p className="text-[11px] text-white/30">
            Probe ringan untuk API source dan policy proxy gambar
          </p>
        </div>
        <button
          onClick={fetchSourceHealth}
          disabled={sourceHealthLoading}
          className="w-8 h-8 rounded-lg bg-white/[.05] border border-white/[.08] flex items-center justify-center text-white/40 hover:text-white transition-colors"
        >
          <FiRefreshCw
            size={13}
            className={sourceHealthLoading ? "animate-spin" : ""}
          />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
          <p className="text-[10px] text-white/30 uppercase font-semibold">
            Bermasalah
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              sourceHealth?.degraded ? "text-red-400" : "text-green-400"
            }`}
            style={{ fontFamily: "Space Mono, monospace" }}
          >
            {sourceHealth?.degraded ?? 0}
          </p>
        </div>
        <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
          <p className="text-[10px] text-white/30 uppercase font-semibold">
            Terakhir cek
          </p>
          <p className="mt-2 text-[12px] text-white/70">
            {sourceHealth?.checkedAt ? timeAgo(sourceHealth.checkedAt) : "Belum dicek"}
          </p>
        </div>
      </div>

      {sourceHealth?.error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12px] text-red-300">
          {sourceHealth.error}
        </div>
      )}

      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold text-white/70">
              Quick Actions
            </p>
            <p className="text-[10px] text-white/30">
              Copy report, buka endpoint, dan test proxy gambar
            </p>
          </div>
          {healthNotice && (
            <span className="text-[10px] text-green-400 bg-green-500/10 rounded-full px-2 py-1">
              {healthNotice}
            </span>
          )}
        </div>

        <button
          onClick={copyHealthReport}
          disabled={!sourceHealth}
          className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-2 text-left text-[12px] text-white/60 transition hover:border-white/20 hover:text-white disabled:opacity-40"
        >
          Copy health report
        </button>

        <div className="flex gap-2">
          <input
            value={imageProxyTestUrl}
            onChange={(event) => setImageProxyTestUrl(event.target.value)}
            placeholder="Paste URL gambar untuk test proxy"
            className="min-w-0 flex-1 rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-2 text-[12px] text-white/70 outline-none placeholder:text-white/25 focus:border-sky-500/40"
          />
          <button
            onClick={openImageProxyTest}
            disabled={!imageProxyTestUrl.trim()}
            className="shrink-0 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-[12px] font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-40"
          >
            Test
          </button>
        </div>

        <div className="rounded-xl border border-white/[.06] bg-white/[.03] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase text-white/25">
            Cache TTL
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-black/20 px-2 py-2">
              <p className="text-[10px] text-white/25">Chapter JSON</p>
              <p className="text-[11px] font-semibold text-white/70">7 hari</p>
            </div>
            <div className="rounded-lg bg-black/20 px-2 py-2">
              <p className="text-[10px] text-white/25">Image Proxy</p>
              <p className="text-[11px] font-semibold text-white/70">7 hari</p>
            </div>
            <div className="rounded-lg bg-black/20 px-2 py-2">
              <p className="text-[10px] text-white/25">Search</p>
              <p className="text-[11px] font-semibold text-white/70">5 menit</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={cacheSourcePath}
            onChange={(event) => setCacheSourcePath(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-2 text-[12px] text-white/70 outline-none placeholder:text-white/25 focus:border-sky-500/40"
          />
          <button
            onClick={openCacheSourceTest}
            disabled={!cacheSourcePath.trim()}
            className="shrink-0 rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-2 text-[12px] font-semibold text-white/60 transition hover:border-white/20 hover:text-white disabled:opacity-40"
          >
            Buka
          </button>
        </div>

        <div className="rounded-xl border border-amber-500/15 bg-amber-500/[.04] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase text-amber-200/50">
            Refresh Chapter Cache
          </p>
          <div className="flex gap-2">
            <input
              value={chapterRefreshPath}
              onChange={(event) => setChapterRefreshPath(event.target.value)}
              placeholder="/chapter/komiku/solo-leveling-chapter-152"
              className="min-w-0 flex-1 rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-[12px] text-white/70 outline-none placeholder:text-white/25 focus:border-amber-500/40"
            />
            <button
              onClick={refreshChapterCache}
              disabled={!chapterRefreshPath.trim() || chapterRefreshLoading}
              className="shrink-0 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12px] font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-40"
            >
              {chapterRefreshLoading ? "..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {(sourceHealth?.sources ?? []).map((source) => (
          <div
            key={source.id}
            className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      source.ok ? "bg-green-400" : "bg-red-400"
                    }`}
                  />
                  <p className="text-[13px] font-bold text-white truncate">
                    {source.label}
                  </p>
                </div>
                <p className="text-[10px] text-white/25 mt-1">
                  {source.id} / gambar:{" "}
                  {source.imageProxy === "always" ? "proxy selalu" : "proxy saat error"}
                </p>
              </div>
              <span
                className={`text-[10px] font-bold rounded-full px-2 py-1 ${
                  source.ok
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {source.ok ? "OK" : "ERROR"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="rounded-xl bg-white/[.04] px-3 py-2">
                <p className="text-[10px] text-white/25">HTTP</p>
                <p className="text-[12px] text-white/70 font-semibold">
                  {source.status || "-"}
                </p>
              </div>
              <div className="rounded-xl bg-white/[.04] px-3 py-2">
                <p className="text-[10px] text-white/25">Latency</p>
                <p className="text-[12px] text-white/70 font-semibold">
                  {source.latencyMs}ms
                </p>
              </div>
              <div className="rounded-xl bg-white/[.04] px-3 py-2">
                <p className="text-[10px] text-white/25">Items</p>
                <p className="text-[12px] text-white/70 font-semibold">
                  {source.itemCount}
                </p>
              </div>
            </div>

            {(source.empty || source.error) && (
              <p className="mt-3 text-[11px] text-red-300/80">
                {source.empty ? "Response kosong" : source.error}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => openSourceEndpoint(source.endpoint)}
                className="rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-2 text-[11px] font-semibold text-white/55 transition hover:border-white/20 hover:text-white"
              >
                Buka API
              </button>
              <button
                onClick={() =>
                  copyText(JSON.stringify(source, null, 2), `${source.label} disalin`)
                }
                className="rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-2 text-[11px] font-semibold text-white/55 transition hover:border-white/20 hover:text-white"
              >
                Copy Detail
              </button>
            </div>
          </div>
        ))}

        {sourceHealthLoading && !sourceHealth && (
          <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-6 text-center text-[12px] text-white/40">
            Mengecek source...
          </div>
        )}
      </div>
    </div>
  );
}
