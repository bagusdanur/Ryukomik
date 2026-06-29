"use client";
import { useEffect, useState } from "react";

export type ReadingMode = "full" | "single" | "double";
export type ImageScaling = "fitwidth" | "fitscreen" | "original";
export type PageSpacing = "none" | "small" | "medium" | "webtoon";

interface ReaderSettings {
  autoNext: boolean;
  scrollSpeed: number;
  tapScrollAmount: number;
  readingMode: ReadingMode;
  imageScaling: ImageScaling;
  pageSpacing: PageSpacing;
}

function asReadingMode(value: string | null): ReadingMode {
  return value === "single" || value === "double" ? value : "full";
}

function asImageScaling(value: string | null): ImageScaling {
  return value === "fitscreen" || value === "original" ? value : "fitwidth";
}

function asPageSpacing(value: string | null): PageSpacing {
  return value === "small" || value === "medium" || value === "webtoon" ? value : "none";
}

export function useReaderSettings() {
  // 1. Initial State (Sama persis dengan bentukan Server)
  const [autoNext, setAutoNext] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(10);
  const [tapScrollAmount, setTapScrollAmount] = useState(400);
  const [readingMode, setReadingMode] = useState<ReadingMode>("full");
  const [imageScaling, setImageScaling] = useState<ImageScaling>("fitwidth");
  const [pageSpacing, setPageSpacing] = useState<PageSpacing>("none");
  const [isLoaded, setIsLoaded] = useState(false);

  // 2. Client-side Hydration (Ambil dari localStorage setelah render pertama)
  useEffect(() => {
    const speed = Number(localStorage.getItem("reader:scrollSpeed"));
    const tap = Number(localStorage.getItem("reader:tapScrollAmount"));

    setAutoNext(localStorage.getItem("reader:autoNext") === "1");
    setScrollSpeed(!isNaN(speed) && speed !== 0 ? speed : 10);
    setTapScrollAmount(!isNaN(tap) && tap !== 0 ? tap : 400);
    setReadingMode(asReadingMode(localStorage.getItem("reader:readingMode")));
    setImageScaling(asImageScaling(localStorage.getItem("reader:imageScaling")));
    setPageSpacing(asPageSpacing(localStorage.getItem("reader:pageSpacing")));
    setIsLoaded(true);
  }, []);

  // 3. Simpan perubahan ke localStorage (Hanya jika data sudah ter-load)
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("reader:autoNext", autoNext ? "1" : "0");
    localStorage.setItem("reader:scrollSpeed", scrollSpeed.toString());
    localStorage.setItem("reader:tapScrollAmount", tapScrollAmount.toString());
    localStorage.setItem("reader:readingMode", readingMode);
    localStorage.setItem("reader:imageScaling", imageScaling);
    localStorage.setItem("reader:pageSpacing", pageSpacing);
  }, [isLoaded, autoNext, scrollSpeed, tapScrollAmount, readingMode, imageScaling, pageSpacing]);

  return {
    isLoaded,
    autoNext, setAutoNext,
    scrollSpeed, setScrollSpeed,
    tapScrollAmount, setTapScrollAmount,
    readingMode, setReadingMode,
    imageScaling, setImageScaling,
    pageSpacing, setPageSpacing,
  };
}
