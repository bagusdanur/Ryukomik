export type SourceGroup = "manga" | "adult" | "novel" | "legacy";
export type ActiveColor = "accent" | "accent-2" | "accent-3";

export interface SourceConfig {
  id: string;
  label: string;
  group: SourceGroup;
  gate?: "age+login";
  activeColor: ActiveColor;
  order: number;
}

export const DEFAULT_SOURCE = "komikid";

export const SOURCES: readonly SourceConfig[] = [
  { id: "komikid",    label: "1",     group: "manga",  order: 1, activeColor: "accent"   },
  { id: "luvyaa",     label: "2",     group: "manga",  order: 2, activeColor: "accent-2" },
  { id: "komiku",     label: "3",     group: "manga",  order: 3, activeColor: "accent"   },
  { id: "ikiru",      label: "4",     group: "manga",  order: 4, activeColor: "accent"   },
  { id: "kiryuu",     label: "5",     group: "manga",  order: 5, activeColor: "accent-2" },
  { id: "sekte",      label: "6",     group: "adult",  order: 6, activeColor: "accent-3", gate: "age+login" },
  { id: "doujindesu", label: "7",     group: "adult",  order: 7, activeColor: "accent-3", gate: "age+login" },
  { id: "meionovels", label: "Novel", group: "novel",  order: 8, activeColor: "accent"   },
] as const;

export type SourceId = (typeof SOURCES)[number]["id"];

// Derived helpers
export const SOURCE_IDS = SOURCES.map(s => s.id);
export const VISIBLE_SOURCES = SOURCES.filter(s => s.group !== "legacy");
export const MANGA_SOURCES = SOURCES.filter(s => s.group === "manga");
export const ADULT_SOURCES = SOURCES.filter(s => s.group === "adult");
export const NOVEL_SOURCES = SOURCES.filter(s => s.group === "novel");
export const ADULT_SOURCE_IDS = new Set(ADULT_SOURCES.map(s => s.id));
export const VALID_SOURCE_IDS = new Set(SOURCES.map(s => s.id));

export const SOURCE_MAP: Record<string, string> = Object.fromEntries(
  SOURCES.map(s => [s.id, s.label])
);

export function getSourceConfig(id: string): SourceConfig | undefined {
  return SOURCES.find(s => s.id === id);
}

export function isAdultSource(id: string): boolean {
  return ADULT_SOURCE_IDS.has(id);
}
