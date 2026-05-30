"use client";

import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import dynamic from "next/dynamic";
import { FiFileText, FiUpload, FiX } from "react-icons/fi";

const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

type ComicReaderProps = {
  search?: string;
};

export default function ComicReader({ search = "" }: ComicReaderProps) {
  const [file, setFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [numPages, setNumPages] = useState<number | null>(null);
  const [width, setWidth] = useState(420);

  useEffect(() => {
    import("react-pdf").then((pdfjsLib) => {
      pdfjsLib.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";
    });
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      const w = window.innerWidth;
      setWidth(w > 760 ? 680 : Math.max(280, w - 32));
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    return () => {
      if (file) URL.revokeObjectURL(file);
    };
  }, [file]);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(URL.createObjectURL(selected));
      setFileName(selected.name);
      setNumPages(null);
    }
  }

  function clearFile() {
    setFile(null);
    setFileName("");
    setNumPages(null);
  }

  const isFilteredOut =
    fileName && search && !fileName.toLowerCase().includes(search.toLowerCase());

  return (
    <div className="text-white">
      {!file ? (
        <div className="rk-card-soft flex min-h-[360px] flex-col items-center justify-center rounded-2xl px-5 py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-200/10 text-cyan-100">
            <FiFileText size={30} />
          </div>
          <h2 className="text-lg font-black">Buka PDF lokal</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/55">
            Pilih file PDF hasil download atau file komik lain dari perangkat ini.
          </p>

          <label className="rk-btn-primary mt-6 flex cursor-pointer items-center gap-2 rounded-2xl px-5 py-3 font-bold">
            <FiUpload size={17} />
            Pilih PDF
            <input
              type="file"
              accept="application/pdf"
              hidden
              onChange={handleFile}
            />
          </label>
        </div>
      ) : isFilteredOut ? (
        <div className="rk-card-soft rounded-2xl py-10 text-center text-white/60">
          PDF tidak cocok dengan pencarian
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-30 mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#090a12]/95 p-3 backdrop-blur">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{fileName}</p>
              <p className="mt-0.5 text-xs text-white/45">
                {numPages ? `${numPages} halaman` : "Memuat halaman..."}
              </p>
            </div>

            <button
              onClick={clearFile}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/60 hover:border-rose-300/30 hover:text-rose-300"
              title="Tutup PDF"
            >
              <FiX size={18} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-1 pb-20">
            <Document
              file={file}
              onLoadSuccess={({ numPages }: { numPages: number }) => setNumPages(numPages)}
              loading={
                <div className="rk-card-soft w-full rounded-2xl py-12 text-center text-white/55">
                  Memuat PDF...
                </div>
              }
              error={
                <div className="rk-card-soft w-full rounded-2xl py-12 text-center text-rose-300">
                  Gagal memuat PDF
                </div>
              }
            >
              {numPages
                ? Array.from({ length: numPages }, (_, index) => (
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={width}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="overflow-hidden bg-white shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
                    />
                  ))
                : null}
            </Document>
          </div>
        </>
      )}
    </div>
  );
}
