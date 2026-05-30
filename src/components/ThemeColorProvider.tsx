"use client";

import { useEffect } from "react";

export const THEME_COLOR_KEY = "rk_theme_color";

export interface ThemeColor {
  key: string;
  name: string;
  foreground: string;
  background: string;
  surface0: string;
  surface1: string;
  surface2: string;
  surface3: string;
  lineSoft?: string;
  lineStrong?: string;
  muted?: string;
  mutedSoft?: string;
  accent: string;
  accent2: string;
  accent3: string;
}

export const THEME_COLORS: ThemeColor[] = [
  {
    key: "violet-cyan",
    name: "Violet Night",
    foreground: "#f7f7fb",
    background: "#090a12",
    surface0: "#0d0f1a",
    surface1: "#121522",
    surface2: "#191d2d",
    surface3: "#23283a",
    accent: "#8b5cf6",
    accent2: "#22d3ee",
    accent3: "#f43f5e",
  },
  {
    key: "red-cyan",
    name: "Crimson Dark",
    foreground: "#fff7f8",
    background: "#10080b",
    surface0: "#170c10",
    surface1: "#1f1117",
    surface2: "#2b1720",
    surface3: "#3a1f2a",
    accent: "#ef4444",
    accent2: "#22d3ee",
    accent3: "#f97316",
  },
  {
    key: "emerald-blue",
    name: "Emerald Deep",
    foreground: "#f2fbf8",
    background: "#06100d",
    surface0: "#0a1713",
    surface1: "#0f1f1a",
    surface2: "#162b24",
    surface3: "#203930",
    accent: "#10b981",
    accent2: "#38bdf8",
    accent3: "#f43f5e",
  },
  {
    key: "pink-indigo",
    name: "Pink Indigo",
    foreground: "#fff7fb",
    background: "#0c0812",
    surface0: "#120d1d",
    surface1: "#181226",
    surface2: "#211936",
    surface3: "#30244b",
    accent: "#ec4899",
    accent2: "#818cf8",
    accent3: "#fb7185",
  },
  {
    key: "mono-dark",
    name: "Mono Dark",
    foreground: "#f5f5f5",
    background: "#080808",
    surface0: "#0e0e0e",
    surface1: "#151515",
    surface2: "#202020",
    surface3: "#2a2a2a",
    accent: "#e5e7eb",
    accent2: "#94a3b8",
    accent3: "#f43f5e",
  },
  {
    key: "pure-black",
    name: "Pure Black",
    foreground: "#f8fafc",
    background: "#000000",
    surface0: "#050505",
    surface1: "#0a0a0a",
    surface2: "#141414",
    surface3: "#202020",
    accent: "#d4d4d8",
    accent2: "#67e8f9",
    accent3: "#fb7185",
  },
  {
    key: "soft-slate",
    name: "Soft Slate",
    foreground: "#f1f5f9",
    background: "#111318",
    surface0: "#161922",
    surface1: "#1c202a",
    surface2: "#252b36",
    surface3: "#313846",
    accent: "#a5b4fc",
    accent2: "#7dd3fc",
    accent3: "#fda4af",
  },
  {
    key: "midnight-blue",
    name: "Midnight Blue",
    foreground: "#eef6ff",
    background: "#07111f",
    surface0: "#0b1728",
    surface1: "#101d30",
    surface2: "#18283e",
    surface3: "#23364f",
    accent: "#60a5fa",
    accent2: "#5eead4",
    accent3: "#f87171",
  },
  {
    key: "paper-white",
    name: "Paper White",
    foreground: "#111827",
    background: "#f8fafc",
    surface0: "#ffffff",
    surface1: "#ffffff",
    surface2: "#eef2f7",
    surface3: "#e2e8f0",
    lineSoft: "rgba(15, 23, 42, 0.10)",
    lineStrong: "rgba(37, 99, 235, 0.24)",
    muted: "rgba(17, 24, 39, 0.62)",
    mutedSoft: "rgba(17, 24, 39, 0.42)",
    accent: "#2563eb",
    accent2: "#0891b2",
    accent3: "#e11d48",
  },
  {
    key: "warm-paper",
    name: "Warm Paper",
    foreground: "#201a14",
    background: "#f7f1e7",
    surface0: "#fffaf1",
    surface1: "#fff7ed",
    surface2: "#f0e4d4",
    surface3: "#e5d6c2",
    lineSoft: "rgba(70, 50, 30, 0.12)",
    lineStrong: "rgba(180, 83, 9, 0.25)",
    muted: "rgba(32, 26, 20, 0.62)",
    mutedSoft: "rgba(32, 26, 20, 0.42)",
    accent: "#b45309",
    accent2: "#0f766e",
    accent3: "#be123c",
  },
  {
    key: "mist-gray",
    name: "Mist Gray",
    foreground: "#172033",
    background: "#eef1f5",
    surface0: "#f8fafc",
    surface1: "#f6f8fb",
    surface2: "#e4e9f0",
    surface3: "#d4dce7",
    lineSoft: "rgba(23, 32, 51, 0.11)",
    lineStrong: "rgba(14, 116, 144, 0.24)",
    muted: "rgba(23, 32, 51, 0.62)",
    mutedSoft: "rgba(23, 32, 51, 0.42)",
    accent: "#475569",
    accent2: "#0e7490",
    accent3: "#dc2626",
  },
  {
    key: "ice-blue",
    name: "Ice Blue",
    foreground: "#0f2433",
    background: "#eff8ff",
    surface0: "#f8fcff",
    surface1: "#ffffff",
    surface2: "#dff1fb",
    surface3: "#c9e5f2",
    lineSoft: "rgba(15, 36, 51, 0.10)",
    lineStrong: "rgba(2, 132, 199, 0.24)",
    muted: "rgba(15, 36, 51, 0.62)",
    mutedSoft: "rgba(15, 36, 51, 0.42)",
    accent: "#0284c7",
    accent2: "#0d9488",
    accent3: "#e11d48",
  },
];

export function applyThemeColor(themeKey?: string | null) {
  const theme =
    THEME_COLORS.find((item) => item.key === themeKey) || THEME_COLORS[0];
  const root = document.documentElement;

  root.style.setProperty("--foreground", theme.foreground);
  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--surface-0", theme.surface0);
  root.style.setProperty("--surface-1", theme.surface1);
  root.style.setProperty("--surface-2", theme.surface2);
  root.style.setProperty("--surface-3", theme.surface3);
  root.style.setProperty("--line-soft", theme.lineSoft || "rgba(255, 255, 255, 0.08)");
  root.style.setProperty("--line-strong", theme.lineStrong || "rgba(165, 180, 252, 0.22)");
  root.style.setProperty("--muted", theme.muted || "rgba(247, 247, 251, 0.62)");
  root.style.setProperty("--muted-soft", theme.mutedSoft || "rgba(247, 247, 251, 0.42)");
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-2", theme.accent2);
  root.style.setProperty("--accent-3", theme.accent3);

  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", theme.background);

  return theme;
}

export default function ThemeColorProvider() {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      applyThemeColor(localStorage.getItem(THEME_COLOR_KEY));
    });

    const onThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ themeKey?: string }>;
      applyThemeColor(customEvent.detail?.themeKey);
    };

    window.addEventListener("rk-theme-color-change", onThemeChange);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("rk-theme-color-change", onThemeChange);
    };
  }, []);

  return null;
}
