# TASK: Redesign Source Picker System — Ryukomik

## Objective
Refactor the source selection system from hardcoded dropdown buttons into a centralized, data-driven "Grouped Chip/Pill" picker. Also re-number sources and add a new source "ikiru".

## New Source Order

| # | SourceId | Label | Group | Gate | Color (active) |
|---|----------|-------|-------|------|-----------------|
| 1 | `ikiru` | Source 1 | manga | — | `cyan-400` |
| 2 | `komikid` | Source 2 | manga | — | `violet-500` |
| 3 | `luvyaa` | Source 3 | manga | — | `cyan-400` |
| 4 | `komiku` | Source 4 | manga | — | `violet-500` |
| 5 | `sekte` | Source 5 | adult | age + login | `rose-500` |
| 6 | `doujindesu` | Source 6 | adult | age + login | `rose-500` |
| — | `meionovels` | Novel | novel | — | `violet-500` |
| — | `kiryuu` | 2 (Legacy) | legacy | — | (hidden from picker, only used in slug detection) |

## Design: Grouped Chip/Pill Row

Replace the vertical dropdown list with a horizontal scrollable chip/pill row inside a floating panel. When user taps the source toggle button, show a panel like this:

```
┌─────────────────────────────────────────────────────┐
│  📚 Manga                                           │
│  [  1  ] [  2  ] [  3  ] [  4  ]                    │
│    ✓                                                │
│                                                     │
│  🔞 18+                                             │
│  [  5  ] [  6  ]                                    │
│                                                     │
│  📖 Lainnya                                         │
│  [ Novel ]                                          │
└─────────────────────────────────────────────────────┘
```

Each chip:
- Default state: `bg-white/[0.06] text-white/60 border border-white/10 rounded-xl px-4 py-2`
- Active state: colored background based on source color (e.g. `bg-cyan-400/15 text-cyan-300 border-cyan-400/30`)
- Active chip shows a small checkmark icon inside
- 18+ chips show a tiny `18+` badge in red below/beside the label
- Chips are compact pill shapes, NOT full-width buttons

## Architecture: Centralized Source Config

### Step 1: Create `src/config/sources.ts`

```typescript
export type SourceGroup = "manga" | "adult" | "novel" | "legacy";

export interface SourceConfig {
  id: string;
  label: string;
  group: SourceGroup;
  gate?: "age+login";
  activeColor: string;       // tailwind color prefix like "cyan-400", "violet-500", "rose-500"
  order: number;
}

export const SOURCES: readonly SourceConfig[] = [
  { id: "ikiru",      label: "1",     group: "manga", order: 1, activeColor: "cyan-400" },
  { id: "komikid",    label: "2",     group: "manga", order: 2, activeColor: "violet-500" },
  { id: "luvyaa",     label: "3",     group: "manga", order: 3, activeColor: "cyan-400" },
  { id: "komiku",     label: "4",     group: "manga", order: 4, activeColor: "violet-500" },
  { id: "sekte",      label: "5",     group: "adult", order: 5, activeColor: "rose-500", gate: "age+login" },
  { id: "doujindesu", label: "6",     group: "adult", order: 6, activeColor: "rose-500", gate: "age+login" },
  { id: "meionovels", label: "Novel", group: "novel", order: 7, activeColor: "violet-500" },
  { id: "kiryuu",     label: "2 (Legacy)", group: "legacy", order: 99, activeColor: "violet-500" },
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
```

### Step 2: Create `src/components/SourcePicker.tsx`

A shared reusable component used by BOTH `Navbar.tsx` AND `HeaderBar.tsx`.

```tsx
"use client";
import { FaCheckCircle } from "react-icons/fa";
import {
  MANGA_SOURCES,
  ADULT_SOURCES,
  NOVEL_SOURCES,
  isAdultSource,
  type SourceConfig,
} from "@/config/sources";
import type { SourceId } from "@/config/sources";

interface SourcePickerProps {
  source: string;
  onSelect: (id: string) => void;
  onAdultGate?: (id: string) => void;  // called when adult source clicked but not unlocked
}

function SourceChip({
  config,
  isActive,
  onClick,
}: {
  config: SourceConfig;
  isActive: boolean;
  onClick: () => void;
}) {
  const isAdult = config.group === "adult";

  // Build dynamic classes based on activeColor
  // Use inline style for the dynamic color since Tailwind can't do runtime interpolation
  const activeStyles: Record<string, { bg: string; text: string; border: string; check: string }> = {
    "cyan-400":   { bg: "bg-cyan-400/15",   text: "text-cyan-300",   border: "border-cyan-400/30",   check: "text-cyan-300" },
    "violet-500": { bg: "bg-violet-500/15",  text: "text-violet-300", border: "border-violet-500/30", check: "text-violet-300" },
    "rose-500":   { bg: "bg-rose-500/15",    text: "text-rose-300",   border: "border-rose-500/30",   check: "text-rose-300" },
  };

  const style = activeStyles[config.activeColor] || activeStyles["cyan-400"];

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all
        ${isActive
          ? `${style.bg} ${style.text} ${style.border} border`
          : "bg-white/[0.06] text-white/60 border border-white/10 hover:bg-white/[0.1] hover:text-white/80"
        }`}
    >
      <span>{config.label}</span>
      {isAdult && <span className="text-[10px] text-red-400 font-bold">18+</span>}
      {isActive && <FaCheckCircle className={`text-[10px] ${style.check}`} />}
    </button>
  );
}

export default function SourcePicker({ source, onSelect, onAdultGate }: SourcePickerProps) {
  const handleSelect = (config: SourceConfig) => {
    if (config.gate === "age+login" && onAdultGate) {
      onAdultGate(config.id);
    } else {
      onSelect(config.id);
    }
  };

  return (
    <div className="rk-card rounded-2xl p-3 space-y-3 min-w-[220px]">
      {/* Manga Group */}
      <div>
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
          📚 Manga
        </p>
        <div className="flex flex-wrap gap-2">
          {MANGA_SOURCES.map(config => (
            <SourceChip
              key={config.id}
              config={config}
              isActive={source === config.id}
              onClick={() => handleSelect(config)}
            />
          ))}
        </div>
      </div>

      {/* Adult Group */}
      <div>
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
          🔞 18+
        </p>
        <div className="flex flex-wrap gap-2">
          {ADULT_SOURCES.map(config => (
            <SourceChip
              key={config.id}
              config={config}
              isActive={source === config.id}
              onClick={() => handleSelect(config)}
            />
          ))}
        </div>
      </div>

      {/* Novel Group */}
      <div>
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
          📖 Lainnya
        </p>
        <div className="flex flex-wrap gap-2">
          {NOVEL_SOURCES.map(config => (
            <SourceChip
              key={config.id}
              config={config}
              isActive={source === config.id}
              onClick={() => handleSelect(config)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Update `src/types/content.ts`

Replace the hardcoded `SourceId` type:

```typescript
// BEFORE:
// export type SourceId = "kiryuu" | "komiku" | "luvyaa" | "sekte" | "doujindesu" | "meionovels" | "komikid";

// AFTER:
export type { SourceId } from "@/config/sources";
```

This re-exports `SourceId` from the centralized config so all existing imports still work.

### Step 4: Update `src/components/Navbar.tsx`

**Remove:**
- The entire hardcoded `sourceMap` Record (lines ~160-168)
- All 6 individual `<button>` blocks for each source inside `{showSource && (...)}`  (lines ~304-455)

**Replace with:**
```tsx
import SourcePicker from "@/components/SourcePicker";
import { SOURCE_MAP } from "@/config/sources";

// Remove the local sourceMap, use SOURCE_MAP instead
// Replace sourceMap[source] with SOURCE_MAP[source]

// Replace the entire {showSource && (<div>...6 buttons...</div>)} block with:
{showSource && (
  <div className="absolute top-14 right-12 mt-2 z-50">
    <SourcePicker
      source={source}
      onSelect={(id) => {
        changeSource(id as SourceKey);
        setShowSource(false);
      }}
      onAdultGate={(id) => {
        if (!isAdult) {
          setShowAgeModal(true);
          setTargetSource(id as SourceKey);
          return;
        }
        if (!user) {
          setShowLogin(true);
          return;
        }
        changeSource(id as SourceKey);
        setShowSource(false);
      }}
    />
  </div>
)}
```

Also update the button label that shows current source:
```tsx
<span className="capitalize">{SOURCE_MAP[source] || "1"}</span>
```

### Step 5: Update `src/components/terbaru/HeaderBar.tsx`

Same approach as Navbar. 

**Remove:**
- The `sourceMap` Record (lines 48-56)
- All 6 individual `<button>` blocks inside `{showSource && (...)}`  (lines 96-245)

**Replace with:**
```tsx
import SourcePicker from "@/components/SourcePicker";
import { SOURCE_MAP } from "@/config/sources";

// Replace the entire {showSource && (<div>...</div>)} block with:
{showSource && (
  <div className="absolute top-14 right-12 mt-2 z-50">
    <SourcePicker
      source={source}
      onSelect={(id) => {
        setSource(id as SourceId);
        setShowSource(false);
      }}
      onAdultGate={(id) => {
        if (!isAdult) {
          setShowAgeModal(true);
          setTargetSource(id as SourceId);
          return;
        }
        if (!user) {
          setShowLogin(true);
          return;
        }
        setSource(id as SourceId);
        setShowSource(false);
      }}
    />
  </div>
)}
```

Update label: `<span className="capitalize">{SOURCE_MAP[source] || "1"}</span>`

### Step 6: Update `src/app/search/SearchClient.tsx`

**Replace:**
```typescript
// BEFORE:
const COMIC_SOURCES: SearchSource[] = [
  { id: "komiku", label: "Source 1" },
  { id: "komikid", label: "Source 2" },
  { id: "luvyaa", label: "Source 3" },
  { id: "sekte", label: "Source 4" },
  { id: "doujindesu", label: "Source 5" },
];
const ADULT_SOURCE_IDS = new Set<SearchSourceId>(["sekte", "doujindesu"]);
const PUBLIC_SOURCES = COMIC_SOURCES.filter((source) => !ADULT_SOURCE_IDS.has(source.id));
const ADULT_SOURCES = COMIC_SOURCES.filter((source) => ADULT_SOURCE_IDS.has(source.id));

// AFTER:
import {
  MANGA_SOURCES,
  ADULT_SOURCES as ADULT_SOURCE_CONFIGS,
  ADULT_SOURCE_IDS,
} from "@/config/sources";

const COMIC_SOURCES: SearchSource[] = [
  ...MANGA_SOURCES.map(s => ({ id: s.id as SearchSourceId, label: `Source ${s.label}` })),
  ...ADULT_SOURCE_CONFIGS.map(s => ({ id: s.id as SearchSourceId, label: `Source ${s.label}` })),
];
const PUBLIC_SOURCES = COMIC_SOURCES.filter(s => !ADULT_SOURCE_IDS.has(s.id));
const ADULT_SOURCES = COMIC_SOURCES.filter(s => ADULT_SOURCE_IDS.has(s.id));
```

### Step 7: Update `src/app/terbaru/TerbaruClient.tsx`

**Replace:**
```typescript
// BEFORE:
const VALID_SOURCES = new Set<SourceId>(["kiryuu", "komikid", "komiku", "luvyaa", "sekte", "doujindesu", "meionovels"]);

// AFTER:
import { VALID_SOURCE_IDS } from "@/config/sources";
const VALID_SOURCES = VALID_SOURCE_IDS;
```

### Step 8: Update `src/app/api/source-health/route.ts`

**Replace the hardcoded SOURCES array:**
```typescript
// BEFORE: hardcoded SOURCES array

// AFTER:
import { VISIBLE_SOURCES } from "@/config/sources";

const SOURCES = VISIBLE_SOURCES
  .filter(s => s.group !== "novel") // health check only for comic sources
  .map(s => ({
    id: s.id,
    label: `Source ${s.label}`,
    path: s.id === "komiku" ? "pustaka-filter?page=1" : "pustaka?page=1",
    localPath: `/api/source/${s.id}/${s.id === "komiku" ? "pustaka-filter" : "pustaka"}?page=1`,
  }));
```

### Step 9: Update `src/components/terbaru/NotificationDropdown.tsx`

Update the `detectSource` function's map array to include `ikiru`:
```typescript
// BEFORE:
const map: SourceId[] = ["kiryuu", "komikid", "komiku", "luvyaa", "sekte", "doujindesu"];

// AFTER:
const map: SourceId[] = ["kiryuu", "komikid", "komiku", "luvyaa", "sekte", "doujindesu", "ikiru"];
```

### Step 10: Update `src/components/Navbar.tsx` detectSource

Same update — add `"ikiru"` to the map array in `detectSource()`:
```typescript
const map: SourceKey[] = ["kiryuu", "komikid", "komiku", "luvyaa", "sekte", "doujindesu", "ikiru"];
```

### Step 11: Update other files that reference adult sources

Files that check `source === "doujindesu" || source === "sekte"` should use the centralized helper:

**`src/lib/imageProxy.ts`** (line ~81):
```typescript
// BEFORE:
const isAdultSource = source === "doujindesu" || source === "sekte";

// AFTER:
import { isAdultSource } from "@/config/sources";
// Then use: isAdultSource(source)
```

**`src/components/LatestComments.tsx`** — update `ADULT_SOURCE_PREFIXES` if needed, and add `"ikiru-"` to `SLUG_PREFIXES`.

### Step 12: Update `src/app/api/source-health/route.ts` imageProxy

Add ikiru to the `getImageProxyMode` function:
```typescript
function getImageProxyMode(sourceId: string) {
  return isAdultSource(sourceId) ? "always" : "on-error";
}
```

## Files to Change (Summary)

| # | File | Action |
|---|------|--------|
| 1 | `src/config/sources.ts` | **CREATE** — centralized source config |
| 2 | `src/components/SourcePicker.tsx` | **CREATE** — shared chip/pill picker component |
| 3 | `src/types/content.ts` | **EDIT** — re-export SourceId from config |
| 4 | `src/components/Navbar.tsx` | **EDIT** — remove 150+ lines of hardcoded buttons, use SourcePicker |
| 5 | `src/components/terbaru/HeaderBar.tsx` | **EDIT** — remove 150+ lines of hardcoded buttons, use SourcePicker |
| 6 | `src/app/search/SearchClient.tsx` | **EDIT** — derive COMIC_SOURCES from config |
| 7 | `src/app/terbaru/TerbaruClient.tsx` | **EDIT** — use VALID_SOURCE_IDS from config |
| 8 | `src/app/api/source-health/route.ts` | **EDIT** — derive SOURCES from config |
| 9 | `src/components/terbaru/NotificationDropdown.tsx` | **EDIT** — add ikiru to detectSource map |
| 10 | `src/lib/imageProxy.ts` | **EDIT** — use isAdultSource() helper |
| 11 | `src/components/LatestComments.tsx` | **EDIT** — add ikiru to slug prefixes |

## Critical Rules

1. **DO NOT change any routing** — `/komik/[source]/[slug]` and `/chapter/[source]/[...slug]` routes stay exactly the same
2. **DO NOT change the backend API** — the API base `https://api.ryukomik.web.id` and endpoint patterns stay the same. Ikiru endpoints will be `https://api.ryukomik.web.id/ikiru/...`
3. **DO NOT remove kiryuu** — keep it in the SourceId type and detectSource functions for backward compatibility. Just don't show it in the picker
4. **DO NOT break the age+login gate** — sekte and doujindesu MUST still require age confirmation modal + login before switching
5. **Keep the click-outside-to-close behavior** — the overlay div that closes the picker panel when clicking outside must remain
6. **Default source stays komiku** — when localStorage has no source saved, default to "komiku" (NOT ikiru). Only the display order/label changes
7. **Preserve the FaExchangeAlt toggle button** — the button that opens/closes the picker stays the same, just update the label text to use SOURCE_MAP
8. **Use `rk-card` class** for the picker panel background — this matches the existing dark glassmorphism card style
9. **SourceId type** — the re-export from config/sources.ts must be compatible. If any file imports `SourceId` from `@/types/content`, it must still work
10. **DO NOT touch FilterPanel.tsx** — the genre/type/status filter panel is separate and unchanged

## Styling Reference

The project uses these CSS custom properties (from the theme):
- `--accent` — primary accent (usually violet/purple)
- `--accent-2` — secondary accent (usually cyan/teal)
- `--surface-1` — card/surface background
- `rk-card` — glassmorphism card class
- `rk-input` — input field class
- `rk-btn-ghost` — ghost button class
- `rk-topbar` — top navigation bar class

Dark theme: backgrounds are near-black (#0a0a0f type), text is white with opacity variants.

## Testing After Implementation

1. Navigate to `/terbaru` — verify SourcePicker shows grouped chips, selecting any source loads content
2. Navigate to `/` (homepage) — verify Navbar SourcePicker works the same
3. Try selecting Source 5 (sekte) — must show age modal first, then login modal if not logged in
4. Try selecting Source 6 (doujindesu) — same gate behavior
5. Navigate to `/search?q=test` — verify search still works across all sources
6. Navigate to `/dashboard` — verify source health tab shows all sources including ikiru
7. Check localStorage key "source" — must save/restore source selection correctly
8. Test ikiru: navigate to `/komik/ikiru/some-slug` — should route correctly
9. Mobile responsive: picker panel should not overflow on small screens
