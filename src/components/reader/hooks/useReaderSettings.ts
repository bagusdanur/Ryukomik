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

function readStoredSettings(): ReaderSettings {
  if (typeof window === "undefined") {
    return {
      autoNext: false,
      scrollSpeed: 10,
      tapScrollAmount: 400,
      readingMode: "full",
      imageScaling: "fitwidth",
      pageSpacing: "none",
    };
  }

  const speed = Number(localStorage.getItem("reader:scrollSpeed"));
  const tap = Number(localStorage.getItem("reader:tapScrollAmount"));

  return {
    autoNext: localStorage.getItem("reader:autoNext") === "1",
    scrollSpeed: !isNaN(speed) && speed !== 0 ? speed : 10,
    tapScrollAmount: !isNaN(tap) && tap !== 0 ? tap : 400,
    readingMode: asReadingMode(localStorage.getItem("reader:readingMode")),
    imageScaling: asImageScaling(localStorage.getItem("reader:imageScaling")),
    pageSpacing: asPageSpacing(localStorage.getItem("reader:pageSpacing")),
  };
}

export function useReaderSettings() {
  const [stored] = useState(readStoredSettings);
  const [autoNext,        setAutoNext]        = useState(stored.autoNext);
  const [scrollSpeed,     setScrollSpeed]     = useState(stored.scrollSpeed);
  const [tapScrollAmount, setTapScrollAmount] = useState(stored.tapScrollAmount);
  const [readingMode,     setReadingMode]     = useState(stored.readingMode);
  const [imageScaling,    setImageScaling]    = useState(stored.imageScaling);
  const [pageSpacing,     setPageSpacing]     = useState(stored.pageSpacing);

  useEffect(() => {
    localStorage.setItem("reader:autoNext",        autoNext ? "1" : "0");
    localStorage.setItem("reader:scrollSpeed",     scrollSpeed.toString());
    localStorage.setItem("reader:tapScrollAmount", tapScrollAmount.toString());
    localStorage.setItem("reader:readingMode",     readingMode);
    localStorage.setItem("reader:imageScaling",    imageScaling);
    localStorage.setItem("reader:pageSpacing",     pageSpacing);
  }, [autoNext, scrollSpeed, tapScrollAmount, readingMode, imageScaling, pageSpacing]);

  return {
    autoNext,        setAutoNext,
    scrollSpeed,     setScrollSpeed,
    tapScrollAmount, setTapScrollAmount,
    readingMode,     setReadingMode,
    imageScaling,    setImageScaling,
    pageSpacing,     setPageSpacing,
  };
}
