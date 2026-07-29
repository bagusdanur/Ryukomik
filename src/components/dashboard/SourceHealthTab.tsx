"use client";

import {
  FiActivity,
  FiAlertCircle,
  FiCheck,
  FiClock,
  FiCopy,
  FiDatabase,
  FiExternalLink,
  FiImage,
  FiRefreshCw,
  FiShield,
  FiZap,
} from "react-icons/fi";

type SourceHealthItem = {
  id: string;
  label: string;
  ok?: boolean;
  imageProxy?: "always" | "fallback" | string;
  status?: string | number;
  latencyMs?: number | null;
  itemCount?: number | null;
  empty?: boolean;
  error?: string | null;
  endpoint: string;
  mode?: "internal-cache" | string;
  note?: string;
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
  if (!dateStr) return "Belum diperiksa";
  const date = new Date(dateStr);
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function latencyLabel(value?: number | null) {
  if (typeof value !== "number") return "Cached";
  return `${value.toLocaleString("id-ID")} ms`;
}

function latencyTone(value?: number | null) {
  if (typeof value !== "number") return "text-sky-300";
  if (value < 1000) return "text-emerald-300";
  if (value < 4000) return "text-amber-300";
  return "text-red-300";
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
}: SourceHealthTabProps) {
  const sources = sourceHealth?.sources ?? [];
  const healthy = sources.filter((source) => source.ok).length;
  const externalSources = sources.filter((source) => source.mode !== "internal-cache");
  const internalSources = sources.filter((source) => source.mode === "internal-cache");
  const isHealthy = Boolean(sourceHealth) && (sourceHealth?.degraded ?? 0) === 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-4 sm:space-y-5 sm:pb-8">
      <section className="relative overflow-hidden rounded-2xl border border-white/[.08] bg-[#11121a] px-4 py-4 sm:rounded-3xl sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${isHealthy ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-amber-400/25 bg-amber-400/10 text-amber-300"}`}>
              <FiActivity size={20} />
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">Source Health</h2>
                {sourceHealth && (
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isHealthy ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>
                    {isHealthy ? "Semua operasional" : "Perlu perhatian"}
                  </span>
                )}
              </div>
              <p className="max-w-xl text-[11px] leading-relaxed text-white/45 sm:text-xs">
                Pantau koneksi source eksternal, respons endpoint, dan kebijakan proxy gambar tanpa menambah beban Project/Supabase.
              </p>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
            <button onClick={copyHealthReport} disabled={!sourceHealth} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[.09] bg-white/[.04] px-3 text-xs font-semibold text-white/65 transition hover:border-white/20 hover:bg-white/[.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:h-10">
              <FiCopy size={14} /> <span className="hidden sm:inline">Salin laporan</span><span className="sm:hidden">Salin</span>
            </button>
            <button onClick={fetchSourceHealth} disabled={sourceHealthLoading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 text-xs font-bold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:px-4">
              <FiRefreshCw size={14} className={sourceHealthLoading ? "animate-spin" : ""} />
              <span className="sm:hidden">Periksa</span><span className="hidden sm:inline">{sourceHealthLoading ? "Memeriksa..." : "Periksa sekarang"}</span>
            </button>
          </div>
        </div>
      </section>

      {sourceHealth?.error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          <FiAlertCircle className="shrink-0" size={17} /> {sourceHealth.error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <Metric icon={<FiCheck size={16} />} label="Source sehat" value={sourceHealth ? `${healthy}/${sources.length}` : "-"} detail="Endpoint aktif" tone="emerald" />
        <Metric icon={<FiAlertCircle size={16} />} label="Gangguan" value={sourceHealth ? String(sourceHealth.degraded ?? 0) : "-"} detail="Butuh tindak lanjut" tone={(sourceHealth?.degraded ?? 0) > 0 ? "red" : "emerald"} />
        <Metric icon={<FiZap size={16} />} label="Source eksternal" value={String(externalSources.length)} detail="Diuji lewat API backend" tone="violet" />
        <Metric icon={<FiClock size={16} />} label="Pemeriksaan terakhir" value={timeAgo(sourceHealth?.checkedAt)} detail="Cache laporan 60 detik" tone="sky" />
      </section>

      <section className="rounded-2xl border border-white/[.07] bg-[#101119] p-3 sm:rounded-3xl sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">Status endpoint</h3>
            <p className="mt-1 text-[11px] text-white/35">Klik endpoint bila perlu melihat respons mentah.</p>
          </div>
          <span className="text-[10px] font-medium text-white/30">{externalSources.length} external · {internalSources.length} internal</span>
        </div>
        <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
          {sources.map((source) => (
            <article key={source.id} className={`rounded-2xl border p-3 sm:p-4 ${source.ok ? "border-white/[.075] bg-white/[.025]" : "border-red-500/20 bg-red-500/[.045]"}`}>
              <div className="flex gap-2.5 sm:gap-3">
                <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${source.ok ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
                  {source.mode === "internal-cache" ? <FiDatabase size={16} /> : source.ok ? <FiCheck size={17} /> : <FiAlertCircle size={17} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0"><h4 className="truncate text-[13px] font-bold text-white">{source.label}</h4><p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/30">{source.mode === "internal-cache" ? "Internal · Cache managed" : `External · ${source.id}`}</p></div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${source.ok ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>{source.ok ? source.mode === "internal-cache" ? "TERKELOLA" : "ONLINE" : "ERROR"}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl border border-white/[.06] bg-black/15 text-center sm:mt-4">
                    <StatusDatum label="Status" value={String(source.status ?? "-")} />
                    <StatusDatum label="Respons" value={latencyLabel(source.latencyMs)} className={latencyTone(source.latencyMs)} />
                    <StatusDatum label="Item" value={source.itemCount == null ? "-" : String(source.itemCount)} />
                  </div>
                  <p className={`mt-3 min-h-4 text-[11px] leading-relaxed ${source.ok ? "text-white/35" : "text-red-200/80"}`}>{source.error || source.note || `Proxy gambar: ${source.imageProxy === "always" ? "selalu aktif" : "saat gagal"}`}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <code className="min-w-0 truncate text-[10px] text-white/25">{source.endpoint}</code>
                    <button onClick={() => openSourceEndpoint(source.endpoint)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/[.08] px-2 py-1.5 text-[10px] font-semibold text-white/55 transition hover:border-white/20 hover:text-white"><FiExternalLink size={11} /> API</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {sourceHealthLoading && !sourceHealth && <div className="col-span-full rounded-2xl border border-white/[.06] bg-white/[.02] p-10 text-center text-xs text-white/40">Mengecek kesehatan source...</div>}
        </div>
      </section>

      <section className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[.07] bg-[#101119] p-4 sm:rounded-3xl sm:p-5">
          <div className="mb-4 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-400/10 text-sky-300"><FiImage size={16} /></div><div><h3 className="text-sm font-bold text-white">Tools diagnostik</h3><p className="text-[11px] text-white/35">Uji proxy gambar atau buka endpoint cache.</p></div></div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-white/30">URL gambar melalui proxy</label>
          <div className="flex flex-col gap-2 sm:flex-row"><input value={imageProxyTestUrl} onChange={(event) => setImageProxyTestUrl(event.target.value)} placeholder="https://.../cover.webp" className="min-w-0 flex-1 rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-xs text-white/75 outline-none placeholder:text-white/20 focus:border-sky-400/40 sm:py-2.5" /><button onClick={openImageProxyTest} disabled={!imageProxyTestUrl.trim()} className="h-11 rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 text-xs font-bold text-sky-200 disabled:opacity-40 sm:h-auto">Uji proxy gambar</button></div>
          <label className="mb-2 mt-4 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Buka endpoint cache</label>
          <div className="flex flex-col gap-2 sm:flex-row"><input value={cacheSourcePath} onChange={(event) => setCacheSourcePath(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-xs text-white/75 outline-none focus:border-sky-400/40 sm:py-2.5" /><button onClick={openCacheSourceTest} disabled={!cacheSourcePath.trim()} className="h-11 rounded-xl border border-white/[.08] bg-white/[.04] px-4 text-xs font-bold text-white/65 disabled:opacity-40 sm:h-auto">Buka endpoint</button></div>
        </div>
        <div className="rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-500/[.06] to-transparent p-4 sm:rounded-3xl sm:p-5">
          <div className="mb-4 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/10 text-amber-200"><FiShield size={16} /></div><div><h3 className="text-sm font-bold text-white">Pemeliharaan cache</h3><p className="text-[11px] text-white/35">Invalidate JSON chapter yang perlu diperbarui.</p></div></div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Path chapter</label>
          <div className="flex flex-col gap-2 sm:flex-row"><input value={chapterRefreshPath} onChange={(event) => setChapterRefreshPath(event.target.value)} placeholder="/chapter/komiku/slug-chapter-1" className="min-w-0 flex-1 rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-xs text-white/75 outline-none placeholder:text-white/20 focus:border-amber-400/40 sm:py-2.5" /><button onClick={refreshChapterCache} disabled={!chapterRefreshPath.trim() || chapterRefreshLoading} className="h-11 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 text-xs font-bold text-amber-100 disabled:opacity-40 sm:h-auto">{chapterRefreshLoading ? "Memproses..." : "Refresh cache"}</button></div>
          <p className="mt-4 text-[11px] leading-relaxed text-amber-100/40">Project tidak diuji ulang dari panel ini; data Project memakai cache endpoint 120 detik agar pemeriksaan tidak menambah egress Supabase.</p>
        </div>
      </section>

      {healthNotice && <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-400/20 bg-[#171722] px-4 py-2 text-xs text-emerald-200 shadow-2xl">{healthNotice}</div>}
    </div>
  );
}

function Metric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "emerald" | "red" | "violet" | "sky" }) {
  const tones = { emerald: "bg-emerald-400/10 text-emerald-300", red: "bg-red-400/10 text-red-300", violet: "bg-violet-400/10 text-violet-300", sky: "bg-sky-400/10 text-sky-300" };
  return <div className="rounded-2xl border border-white/[.07] bg-[#11121a] p-3 sm:p-4"><div className="flex items-center justify-between gap-1"><p className="text-[9px] font-semibold uppercase tracking-wider text-white/35 sm:text-[10px]">{label}</p><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg sm:h-7 sm:w-7 ${tones[tone]}`}>{icon}</span></div><p className="mt-2 truncate text-lg font-bold tracking-tight text-white sm:mt-3 sm:text-xl">{value}</p><p className="mt-1 truncate text-[9px] text-white/30 sm:text-[10px]">{detail}</p></div>;
}

function StatusDatum({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className="border-r border-white/[.06] px-1 py-2.5 last:border-r-0"><p className="text-[9px] uppercase tracking-wide text-white/25">{label}</p><p className={`mt-1 truncate text-[11px] font-bold text-white/70 ${className}`}>{value}</p></div>;
}
