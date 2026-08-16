"use client";

import { useState } from "react";
import { FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
import { FiDownload } from "react-icons/fi";
import type { User } from "@supabase/supabase-js";
import { blobToPdfImage, fetchDownloadChapter, fetchDownloadImage, imageExtension, saveBlob } from "@/lib/chapterDownload";

type DownloadType = "zip" | "pdf";

type BatchChapter = {
  slug: string;
  label?: string;
};

type ChapterImagesResponse = {
  images: string[];
  chapterSlug?: string;
  currentChapter?: string;
};

type BatchDownloadButtonProps = {
  source: string;
  chapters: BatchChapter[];
  isPremium?: boolean;
  user?: User | null;
};

function formatTitleFromSlug(slug?: string, currentChapter?: string) {
  if (currentChapter) {
    const fullMatch = currentChapter.match(/^Baca\s+(.+?)\s+Chapter\s+([\d.]+)/i);
    if (fullMatch) {
      const title = fullMatch[1].trim();
      const ch = fullMatch[2].split(".")[0].padStart(2, "0");
      return `${title} - Ch. ${ch}`;
    }
    const shortMatch = currentChapter.match(/^Chapter\s+([\d.]+)/i);
    if (shortMatch) {
      const titleFromSlug = slug
        ? slug.split("/")[0]
            .replace(/-chapter-[\d.]+$/i, "")
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        : "Unknown";
      const ch = shortMatch[1].split(".")[0].padStart(2, "0");
      return `${titleFromSlug} - Ch. ${ch}`;
    }
  }
  if (!slug) return "Unknown";
  let cleanSlug = slug.split("/").filter(Boolean).pop() ?? "";
  cleanSlug = cleanSlug.replace(/-?chapter[-/]?[\d.]+/i, "");
  const title = cleanSlug
    .split("-").filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const chMatch = slug.match(/chapter[-/]?([\d.]+)/i);
  const ch = chMatch ? chMatch[1].split(".")[0].padStart(2, "0") : "";
  return ch ? `${title} - Ch. ${ch}` : title || "Unknown";
}

export default function BatchDownloadButton({ source, chapters, isPremium, user }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [overall, setOverall] = useState(0);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const handleBatch = async (type: DownloadType = "zip") => {
    if (!user || !isPremium) {
      alert("Fitur Premium 💎");
      return;
    }
    if (loading) return;

    setLoading(true);
    setLogs([]);
    setOverall(0);

    const { default: JSZip } = await import("jszip");
    const JsPdf = type === "pdf" ? (await import("jspdf")).jsPDF : null;
    const zip = new JSZip();
    let successCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < chapters.length; i++) {
      const { slug, label } = chapters[i];
      addLog(`⏳ ${label}...`);

      try {
        const { images, chapterSlug, currentChapter } = await fetchDownloadChapter(source, slug);
        const title = formatTitleFromSlug(chapterSlug || slug, currentChapter);

        if (images.length === 0) {
          addLog(`⚠️ ${label}: gambar tidak ditemukan`);
          skippedCount++;
          setOverall(Math.round(((i + 1) / chapters.length) * 100));
          continue;
        }

        if (images.length > 80) {
          addLog(`⚠️ ${label}: terlalu besar (${images.length} gambar), dilewati`);
          skippedCount++;
          setOverall(Math.round(((i + 1) / chapters.length) * 100));
          continue;
        }

        if (type === "pdf") {
          let pdf: import("jspdf").jsPDF | null = null;
          for (let j = 0; j < images.length; j++) {
            const blob = await fetchDownloadImage(images[j], j + 1);
            const { dataUrl, width: w, height: h } = await blobToPdfImage(blob);
                if (!pdf) {
                  pdf = new JsPdf!({ unit: "px", format: [w, h] });
                } else {
                  pdf.addPage([w, h]);
                }
                pdf.addImage(dataUrl, "JPEG", 0, 0, w, h, undefined, "FAST");
                pdf.setFontSize(22);
                pdf.setTextColor(0, 0, 0);
                pdf.text("Ryukomik.my.id", w / 2, h - 8, { align: "center" });
          }
          const pdfBlob = pdf?.output("blob");
          if (pdfBlob) zip.file(`${title}.pdf`, pdfBlob);
        } else {
          const folder = zip.folder(title);
          for (let j = 0; j < images.length; j++) {
            const blob = await fetchDownloadImage(images[j], j + 1);
            folder?.file(`${String(j + 1).padStart(3, "0")}.${imageExtension(blob)}`, blob);
          }
        }

        successCount++;
        addLog(`✅ ${label} selesai`);
      } catch (e) {
        addLog(`❌ ${label}: gagal`);
        skippedCount++;
      }

      setOverall(Math.round(((i + 1) / chapters.length) * 100));
    }

    // Semua chapter gagal/terlalu besar — jangan buat ZIP kosong
    if (successCount === 0) {
      addLog(`❌ Semua chapter tidak bisa diunduh — ZIP dibatalkan`);
      setLoading(false);
      return;
    }

    // Ada yang berhasil, ada yang dilewati — kasih info
    if (skippedCount > 0) {
      addLog(`ℹ️ ${skippedCount} chapter dilewati, ${successCount} berhasil`);
    }

    addLog("📦 Membuat ZIP...");
    const content = await zip.generateAsync({ type: "blob" });
    saveBlob(content, `ryukomik_batch_${type}.zip`);

    addLog("🎉 Selesai!");
    setLoading(false);
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[#6d4eef] active:scale-[0.98] transition text-sm font-semibold disabled:opacity-60"
      >
        <FiDownload size={15} />
        {loading ? `${overall}%` : `Download (${chapters.length})`}
        {!loading && (open ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute right-0 top-10 z-50 bg-[#222] border border-white/10 rounded-xl shadow-xl p-4"
          style={{ width: "260px" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Batch Download</span>
            <button onClick={() => setOpen(false)}>
              <FiX size={15} className="text-white/40 hover:text-white" />
            </button>
          </div>

          <p className="text-xs text-white/40 mb-3">
            {chapters.length} chapter dipilih
          </p>

          {/* Format buttons */}
          {!loading && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => handleBatch("zip")}
                className="flex-1 py-2 rounded-lg bg-[var(--accent)] hover:bg-[#6d4eef] text-sm font-semibold transition"
              >
                ZIP
              </button>
              <button
                onClick={() => handleBatch("pdf")}
                className="flex-1 py-2 rounded-lg bg-[#333] hover:bg-white/10 text-sm font-semibold transition border border-white/10"
              >
                PDF
              </button>
            </div>
          )}

          {/* Progress bar */}
          {loading && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span>Progress</span>
                <span>{overall}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div
                  className="bg-[var(--accent)] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${overall}%` }}
                />
              </div>
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 mt-2">
              {logs.map((log, i) => (
                <p
                  key={i}
                  className={`text-xs leading-relaxed ${
                    log.startsWith("❌")
                      ? "text-red-400/70"
                      : log.startsWith("⚠️")
                      ? "text-yellow-400/70"
                      : log.startsWith("✅")
                      ? "text-green-400/70"
                      : "text-white/40"
                  }`}
                >
                  {log}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
