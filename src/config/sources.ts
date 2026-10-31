export type SourceGroup = "manga" | "adult" | "novel" | "legacy" | "project";
export type ActiveColor = "accent" | "accent-2" | "accent-3" | "emerald-500";

export interface SourceConfig {
  id: string;
  label: string;
  group: SourceGroup;
  gate?: "age+login";
  activeColor: ActiveColor | string;
  order: number;
  hasFilter?: boolean;
}

export const DEFAULT_SOURCE = "komikid";

export const SOURCES: readonly SourceConfig[] = [
  // Komiku (komiku.org) sedang diblokir Cloudflare → diturunkan ke slot 4.
  { id: "komiku",     label: "4",       group: "manga",     order: 4, activeColor: "accent",   hasFilter: true },
  { id: "josei",      label: "2",       group: "manga",     order: 2, activeColor: "accent-2", hasFilter: true },
  { id: "luvyaa",     label: "3",       group: "manga",     order: 3, activeColor: "accent-2", hasFilter: true },
  // Komikid naik ke slot 1 karena sumbernya masih bisa di-scrape normal.
  { id: "komikid",    label: "1",       group: "manga",     order: 1, activeColor: "accent",   hasFilter: true },
  { id: "kiryuu",     label: "5",       group: "manga",     order: 5, activeColor: "accent",   hasFilter: true },
  { id: "sekte",      label: "6",       group: "adult",     order: 6, activeColor: "accent-3", gate: "age+login", hasFilter: true },
  { id: "doujindesu", label: "7",       group: "adult",     order: 7, activeColor: "accent-3", gate: "age+login", hasFilter: true },
  { id: "meionovels", label: "Novel",   group: "novel",     order: 8, activeColor: "accent"   },
  { id: "project",  label: "Project", group: "project", order: 9, activeColor: "emerald-500", hasFilter: true },
  // Tetap valid untuk URL, histori, bookmark, dan komentar lama, tetapi tidak ditampilkan di pemilih sumber.
  { id: "ikiru", label: "Ikiru Legacy", group: "legacy", order: 99, activeColor: "accent-2" },
] as const;

export type SourceId = (typeof SOURCES)[number]["id"];

// Derived helpers
export const SOURCE_IDS = SOURCES.map(s => s.id);
// Urutan tampil SELALU mengikuti field `order`, bukan urutan deklarasi array.
// Kalau memakai urutan deklarasi, hasil tukar slot (Komikid <-> Komiku) jadi
// tampil acak seperti 4, 2, 3, 1, 5.
const byOrder = (a: SourceConfig, b: SourceConfig) => a.order - b.order;
export const VISIBLE_SOURCES = SOURCES.filter(s => s.group !== "legacy").sort(byOrder);
export const MANGA_SOURCES = SOURCES.filter(s => s.group === "manga").sort(byOrder);
export const ADULT_SOURCES = SOURCES.filter(s => s.group === "adult").sort(byOrder);
export const NOVEL_SOURCES = SOURCES.filter(s => s.group === "novel").sort(byOrder);
export const PROJECT_SOURCES = SOURCES.filter(s => s.group === "project").sort(byOrder);
export const ADULT_SOURCE_IDS = new Set(ADULT_SOURCES.map(s => s.id));
export const VALID_SOURCE_IDS = new Set(SOURCES.map(s => s.id));
export const FILTERABLE_SOURCE_IDS = new Set(SOURCES.filter(s => s.hasFilter).map(s => s.id));

export function sourceHasFilter(id: string): boolean {
  return FILTERABLE_SOURCE_IDS.has(id);
}

export const SOURCE_MAP: Record<string, string> = Object.fromEntries(
  SOURCES.map(s => [s.id, s.label])
);

export function getSourceConfig(id: string): SourceConfig | undefined {
  return SOURCES.find(s => s.id === id);
}

export function isAdultSource(id: string): boolean {
  return ADULT_SOURCE_IDS.has(id);
}
