"use client";

import { useState } from "react";
import { FiAlertTriangle, FiArchive, FiCheckCircle, FiChevronDown, FiChevronUp, FiClock, FiDownload, FiFileText, FiLoader, FiPackage, FiX, FiXCircle } from "react-icons/fi";
import type { IconType } from "react-icons";
import type { User } from "@supabase/supabase-js";
import { blobToPdfImage, fetchDownloadChapter, fetchDownloadImage, imageExtension, saveBlob } from "@/lib/chapterDownload";

type DownloadType = "zip" | "pdf";
type ProgressStatus = "queued" | "downloading" | "success" | "skipped" | "error";
type BatchPhase = "idle" | "downloading" | "packing" | "done" | "error";
type BatchChapter = { slug: string; label?: string };
type ChapterProgress = BatchChapter & { status: ProgressStatus; detail?: string };
type Props = { source: string; chapters: BatchChapter[]; isPremium?: boolean; user?: User | null };

function formatTitleFromSlug(slug?: string, currentChapter?: string) {
  if (currentChapter) {
    const full = currentChapter.match(/^Baca\s+(.+?)\s+Chapter\s+([\d.]+)/i);
    if (full) return `${full[1].trim()} - Ch. ${full[2].split(".")[0].padStart(2, "0")}`;
    const short = currentChapter.match(/^Chapter\s+([\d.]+)/i);
    if (short) {
      const title = slug ? slug.split("/")[0].replace(/-chapter-[\d.]+$/i, "").split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") : "Unknown";
      return `${title} - Ch. ${short[1].split(".")[0].padStart(2, "0")}`;
    }
  }
  if (!slug) return "Unknown";
  const clean = (slug.split("/").filter(Boolean).pop() ?? "").replace(/-?chapter[-/]?[\d.]+/i, "");
  const title = clean.split("-").filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  const match = slug.match(/chapter[-/]?([\d.]+)/i);
  const chapter = match ? match[1].split(".")[0].padStart(2, "0") : "";
  return chapter ? `${title} - Ch. ${chapter}` : title || "Unknown";
}

const STATUS: Record<ProgressStatus, { icon: IconType; color: string; text: string }> = {
  queued: { icon: FiClock, color: "text-white/30", text: "Menunggu giliran" },
  downloading: { icon: FiLoader, color: "animate-spin text-cyan-300", text: "Menyiapkan..." },
  success: { icon: FiCheckCircle, color: "text-emerald-400", text: "Siap dikemas" },
  skipped: { icon: FiAlertTriangle, color: "text-amber-400", text: "Dilewati" },
  error: { icon: FiXCircle, color: "text-rose-400", text: "Gagal diunduh" },
};

export default function BatchDownloadButton({ source, chapters, isPremium, user }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ChapterProgress[]>([]);
  const [overall, setOverall] = useState(0);
  const [phase, setPhase] = useState<BatchPhase>("idle");
  const [format, setFormat] = useState<DownloadType>("zip");

  const updateItem = (slug: string, status: ProgressStatus, detail?: string) => {
    setItems((current) => current.map((item) => item.slug === slug ? { ...item, status, detail } : item));
  };

  const reset = () => { setPhase("idle"); setItems([]); setOverall(0); };

  const handleBatch = async (type: DownloadType) => {
    if (!user || !isPremium) { alert("Fitur ini khusus pengguna Premium"); return; }
    if (loading) return;
    setLoading(true); setFormat(type); setPhase("downloading"); setOverall(0);
    setItems(chapters.map((chapter) => ({ ...chapter, status: "queued" })));

    try {
      const { default: JSZip } = await import("jszip");
      const JsPdf = type === "pdf" ? (await import("jspdf")).jsPDF : null;
      const zip = new JSZip();
      let success = 0;

      for (let index = 0; index < chapters.length; index++) {
        const { slug } = chapters[index];
        updateItem(slug, "downloading", "Mengambil data chapter");
        try {
          const { images, chapterSlug, currentChapter } = await fetchDownloadChapter(source, slug);
          const title = formatTitleFromSlug(chapterSlug || slug, currentChapter);
          if (!images.length) { updateItem(slug, "skipped", "Gambar tidak ditemukan"); continue; }
          if (images.length > 80) { updateItem(slug, "skipped", `Terlalu besar · ${images.length} gambar`); continue; }

          if (type === "pdf") {
            let pdf: import("jspdf").jsPDF | null = null;
            for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
              updateItem(slug, "downloading", `${imageIndex + 1} dari ${images.length} gambar`);
              const blob = await fetchDownloadImage(images[imageIndex], imageIndex + 1);
              const image = await blobToPdfImage(blob);
              if (!pdf) pdf = new JsPdf!({ unit: "px", format: [image.width, image.height] });
              else pdf.addPage([image.width, image.height]);
              pdf.addImage(image.dataUrl, "JPEG", 0, 0, image.width, image.height, undefined, "FAST");
              pdf.setFontSize(22); pdf.setTextColor(0, 0, 0);
              pdf.text("Ryukomik.my.id", image.width / 2, image.height - 8, { align: "center" });
            }
            const blob = pdf?.output("blob");
            if (blob) zip.file(`${title}.pdf`, blob);
          } else {
            const folder = zip.folder(title);
            for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
              updateItem(slug, "downloading", `${imageIndex + 1} dari ${images.length} gambar`);
              const blob = await fetchDownloadImage(images[imageIndex], imageIndex + 1);
              folder?.file(`${String(imageIndex + 1).padStart(3, "0")}.${imageExtension(blob)}`, blob);
            }
          }
          success++; updateItem(slug, "success", `${images.length} gambar siap`);
        } catch { updateItem(slug, "error", "Tidak dapat mengunduh chapter"); }
        finally { setOverall(Math.round(((index + 1) / chapters.length) * 100)); }
      }

      if (!success) { setPhase("error"); return; }
      setPhase("packing"); setOverall(0);
      const content = await zip.generateAsync({ type: "blob" }, ({ percent }) => setOverall(Math.round(percent)));
      saveBlob(content, `ryukomik_batch_${type}.zip`);
      setOverall(100); setPhase("done");
    } catch { setPhase("error"); }
    finally { setLoading(false); }
  };

  const successCount = items.filter((item) => item.status === "success").length;
  const issueCount = items.filter((item) => item.status === "skipped" || item.status === "error").length;
  const phaseText = phase === "packing" ? `Mengemas ${format.toUpperCase()}...` : phase === "done" ? "Download selesai" : phase === "error" ? "Download gagal" : "Mengunduh chapter...";
  const PhaseIcon = phase === "packing" ? FiPackage : phase === "done" ? FiCheckCircle : phase === "error" ? FiXCircle : FiLoader;

  return (
    <div className="relative">
      <button onClick={() => setOpen((value) => !value)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold transition hover:bg-[#6d4eef] active:scale-[0.98]">
        {loading ? <FiLoader size={15} className="animate-spin" /> : <FiDownload size={15} />}
        {loading ? `${overall}%` : `Download (${chapters.length})`}
        {open ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
      </button>

      {open && <div className="absolute right-0 top-11 z-50 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/10 bg-[#17181d]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"><FiDownload size={19} /></span>
            <div><h3 className="text-sm font-bold text-white">Batch Download</h3><p className="mt-0.5 text-[11px] text-white/45">{chapters.length} chapter dipilih · maksimal 5</p></div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Tutup panel download" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"><FiX size={17} /></button>
        </header>

        <div className="p-4">
          {phase === "idle" ? <>
            <p className="mb-3 text-xs leading-relaxed text-white/55">Pilih format. Semua chapter akan dikemas menjadi satu file agar mudah disimpan.</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleBatch("zip")} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-3 text-sm font-bold text-white transition hover:brightness-110"><FiArchive size={17} /> ZIP</button>
              <button onClick={() => handleBatch("pdf")} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-sm font-bold text-white transition hover:bg-white/10"><FiFileText size={17} /> PDF</button>
            </div>
          </> : <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-white/75"><PhaseIcon className={`${phase === "downloading" ? "animate-spin text-cyan-300" : phase === "done" ? "text-emerald-400" : phase === "error" ? "text-rose-400" : "text-violet-300"}`} /><span>{phaseText}</span></div>
              <span className="rounded-lg bg-white/[0.07] px-2 py-1 text-[10px] font-bold text-white/60">{format.toUpperCase()}</span>
            </div>
            <div className="mb-4">
              <div className="mb-1.5 flex justify-between text-[11px] text-white/45"><span>{successCount} berhasil{issueCount ? ` · ${issueCount} dilewati` : ""}</span><span className="font-semibold text-white/70">{overall}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className={`h-full rounded-full transition-all duration-300 ${phase === "error" ? "bg-rose-500" : phase === "done" ? "bg-emerald-400" : "bg-gradient-to-r from-violet-500 to-cyan-400"}`} style={{ width: `${overall}%` }} /></div>
            </div>
            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
              {items.map((item) => { const meta = STATUS[item.status]; const StatusIcon = meta.icon; return <div key={item.slug} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2.5"><StatusIcon size={16} className={`shrink-0 ${meta.color}`} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white/85">{item.label || "Chapter"}</p><p className="mt-0.5 truncate text-[10px] text-white/40">{item.detail || meta.text}</p></div></div>; })}
            </div>
            {!loading && <button onClick={reset} className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">Download lagi</button>}
          </>}
        </div>
      </div>}
    </div>
  );
}
