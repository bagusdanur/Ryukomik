import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReadingMode = "full" | "single" | "double";
export type ImageScaling = "fitwidth" | "fitscreen" | "original";
export type PageSpacing = "none" | "small" | "medium" | "webtoon";

export interface ReaderSettingsState {
  autoNext: boolean;
  scrollSpeed: number;
  tapScrollAmount: number;
  readingMode: ReadingMode;
  imageScaling: ImageScaling;
  pageSpacing: PageSpacing;
  
  // Actions
  setAutoNext: (val: boolean) => void;
  setScrollSpeed: (val: number) => void;
  setTapScrollAmount: (val: number) => void;
  setReadingMode: (val: ReadingMode) => void;
  setImageScaling: (val: ImageScaling) => void;
  setPageSpacing: (val: PageSpacing) => void;
}

export const useReaderStore = create<ReaderSettingsState>()(
  persist(
    (set) => ({
      autoNext: false,
      scrollSpeed: 10,
      tapScrollAmount: 400,
      readingMode: "full",
      imageScaling: "fitwidth",
      pageSpacing: "none",

      setAutoNext: (val) => set({ autoNext: val }),
      setScrollSpeed: (val) => set({ scrollSpeed: val }),
      setTapScrollAmount: (val) => set({ tapScrollAmount: val }),
      setReadingMode: (val) => set({ readingMode: val }),
      setImageScaling: (val) => set({ imageScaling: val }),
      setPageSpacing: (val) => set({ pageSpacing: val }),
    }),
    {
      name: "reader-settings", // key in localStorage
    }
  )
);
