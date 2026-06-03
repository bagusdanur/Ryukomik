"use client";

import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { useState, useEffect } from "react";
import { FiDownload, FiX } from "react-icons/fi";
import type { User } from "@supabase/supabase-js";
import { loadCachedRole } from "@/utils/roleCache";

type DownloadType = "pdf" | "zip";

type DownloadButtonProps = {
  slug: string;
  source: string;
  isPremium?: boolean;
  user?: User | null;
  onPremium?: () => void;
};

type ChapterResponse = {
  images?: string[];
  chapterSlug?: string;
  currentChapter?: string;
};

export default function DownloadButton({
  slug,
  source,
  isPremium,
  user,
  onPremium,
}: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const fetchRole = async () => {
      const role = await loadCachedRole(user.id).catch(() => null);
      setIsAdmin(role?.isAdmin === true);
    };
    fetchRole();
  }, [user?.id]);

  const handleDownload = async (type: DownloadType = "pdf") => {
    if (!user) {
      onPremium?.();
      setOpen(false);
      return;
    }

    if (!isPremium) {
      onPremium?.();
      setOpen(false);
      return;
    }

    if (loading) return;

    setLoading(true);
    setProgress(0);

    try {
      const res = await fetch(
        `https://mgkomik-backend-three.vercel.app/${source}/chapter/${slug}`,
      );
      const data = (await res.json()) as ChapterResponse;

      const images = data.images || [];

      const chapterTitle = formatTitleFromSlug(
        data.chapterSlug,
        data.currentChapter,
      );

      if (images.length === 0) {
        alert("Gambar tidak ditemukan");
        setLoading(false);
        return;
      }

      if (images.length > 80 && !isAdmin) {
        alert("Chapter terlalu besar");
        setLoading(false);
        return;
      }

      // =========================
      // 🔥 ZIP MODE
      // =========================
      if (type === "zip") {
        const zip = new JSZip();
        const folder = zip.folder(chapterTitle);

        for (let i = 0; i < images.length; i++) {
          const res = await fetch(
            `/api/image?url=${encodeURIComponent(images[i])}`,
          );
          const blob = await res.blob();

          const fileName = `${String(i + 1).padStart(3, "0")}.jpg`;
          folder?.file(fileName, blob);

          setProgress(Math.round(((i + 1) / images.length) * 100));
        }

        const content = await zip.generateAsync({ type: "blob" });

        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = `${chapterTitle}.zip`;
        a.click();

        setLoading(false);
        setProgress(0);
        return;
      }

      // =========================
      // 🔥 PDF MODE (DEFAULT)
      // =========================
      let pdf: jsPDF | null = null;
      let done = 0;

      for (let i = 0; i < images.length; i++) {
        const res = await fetch(
          `/api/image?url=${encodeURIComponent(images[i])}`,
        );

        const blob = await res.blob();
        const imgData = await blobToBase64(blob);

        const img = new Image();
        img.src = imgData;

        await new Promise<void>((resolve) => {
          img.onload = () => {
            const maxWidth = 1000;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              const ratio = maxWidth / width;
              width = maxWidth;
              height = height * ratio;
            }

            if (!pdf) {
              pdf = new jsPDF({
                unit: "px",
                format: [width, height],
              });
            } else {
              pdf.addPage([width, height]);
            }

            pdf.addImage(img, "JPEG", 0, 0, width, height, undefined, "FAST");

            // watermark
            pdf.setFontSize(22);
            pdf.setTextColor(0, 0, 0);
            const GState = pdf.GState as unknown as new (options: {
              opacity: number;
            }) => Parameters<typeof pdf.setGState>[0];
            pdf.setGState(new GState({ opacity: 1 }));

            pdf.text("Ryukomik.my.id", width / 2, height - 8, {
              align: "center",
            });

            resolve();
          };
        });

        done++;
        setProgress(Math.round((done / images.length) * 100));
      }

      pdf?.save(`${chapterTitle}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Gagal download");
    }

    setLoading(false);
    setProgress(0);
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result ?? ""));
      reader.readAsDataURL(blob);
    });

  function formatTitleFromSlug(slug?: string, currentChapter?: string) {
    // Coba extract dari currentChapter dulu (paling akurat)
    // Contoh: "Baca Return of The Greatest Lancer Chapter 06 Bahasa Indonesia"
    // Contoh: "Chapter 9"
    if (currentChapter) {
      const fullMatch = currentChapter.match(
        /^Baca\s+(.+?)\s+Chapter\s+([\d.]+)/i,
      );
      if (fullMatch) {
        const title = fullMatch[1].trim();
        const ch = fullMatch[2].split(".")[0].padStart(2, "0");
        return `${title} - Ch. ${ch}`;
      }

      // Format pendek: "Chapter 9"
      const shortMatch = currentChapter.match(/^Chapter\s+([\d.]+)/i);
      if (shortMatch) {
        // Ambil judul dari slug/mangaId sebagai fallback
        const titleFromSlug = slug
          ? slug
              .split("/")[0]
              .replace(/-chapter-[\d.]+$/i, "")
              .split("-")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")
          : "Unknown";
        const ch = shortMatch[1].split(".")[0].padStart(2, "0");
        return `${titleFromSlug} - Ch. ${ch}`;
      }
    }

    // Fallback: parse dari slug
    if (!slug) return "Unknown";
    let cleanSlug = slug.split("/").filter(Boolean).pop() ?? "";
    cleanSlug = cleanSlug.replace(/-?chapter[-/]?[\d.]+/i, "");
    const title = cleanSlug
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const chMatch = slug.match(/chapter[-/]?([\d.]+)/i);
    const ch = chMatch ? chMatch[1].split(".")[0].padStart(2, "0") : "";
    return ch ? `${title} - Ch. ${ch}` : title || "Unknown";
  }

  return (
    <div className="relative w-full h-full">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="
        w-full h-full
        rounded-2xl
        bg-white/[0.04]
        hover:bg-white/[0.06]
        border border-white/[0.07]
        hover:border-white/15
        flex items-center justify-center
        transition-all duration-200
        active:scale-95
      "
      >
        {!loading ? (
          <FiDownload size={16} className="text-white/35" />
        ) : (
          <span className="text-[10px] text-white/50">{progress}%</span>
        )}
      </button>

      {/* dropdown */}
      {open && !loading && (
        <div className="absolute flex flex-col bg-[#222] p-2 rounded shadow-lg top-10 right-0 z-50 min-w-[120px] gap-2">
          <button
            onClick={() => {
              handleDownload("pdf");
              setOpen(false);
            }}
            className="text-sm hover:bg-white/10 px-3 py-1 rounded text-left border border-[#282828]"
          >
            DL PDF
          </button>

          <button
            onClick={() => {
              handleDownload("zip");
              setOpen(false);
            }}
            className="text-sm hover:bg-white/10 px-3 py-1 rounded text-left border border-[#282828]"
          >
            DL ZIP
          </button>
        </div>
      )}
    </div>
  );
}
