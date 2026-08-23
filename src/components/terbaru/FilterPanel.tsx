"use client";
import type { Dispatch, SetStateAction } from "react";
import type { SourceId, TerbaruFilters, UpdateItem } from "@/types/content";
import Button from "@/components/Button";

interface FilterPanelProps {
  showFilter: boolean;
  filters: TerbaruFilters;
  tipe: string;
  status: string;
  genre: string;
  genre2: string;
  setTipe: (value: string) => void;
  setStatus: (value: string) => void;
  setGenre: (value: string) => void;
  setGenre2: (value: string) => void;
  setOrderby: (value: string) => void;
  setPage: Dispatch<SetStateAction<number>>;
  setData: Dispatch<SetStateAction<UpdateItem[]>>;
  setHasMore: Dispatch<SetStateAction<boolean>>;
  fetchData: (page: number, source?: SourceId) => Promise<void>;
}

export default function FilterPanel({
  showFilter,
  filters,
  tipe,
  status,
  genre,
  genre2,
  setTipe,
  setStatus,
  setGenre,
  setGenre2,
  setOrderby,
  setPage,
  setData,
  setHasMore,
  fetchData,
}: FilterPanelProps) {
  if (!showFilter || !filters) return null;

  return (
    <div className="rk-card mb-4 rounded-2xl px-3 py-3">

      {/* GRID 2 KOLOM (TIDAK DIUBAH) */}
      <div className="grid grid-cols-2 gap-2">

        {/* TIPE */}
        {Boolean(filters.tipe?.length) && <select
          value={tipe}
          onChange={(e) => setTipe(e.target.value)}
          className="rk-input w-full rounded-xl px-3 py-2.5 text-sm"
        >
          {filters.tipe?.map((t) => (
            <option key={t.value} value={t.value} className="text-black">
              {t.label}
            </option>
          ))}
        </select>}

        {/* STATUS */}
        {Boolean(filters.status?.length) && <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rk-input w-full rounded-xl px-3 py-2.5 text-sm"
        >
          {filters.status?.map((s) => (
            <option key={s.value} value={s.value} className="text-black">
              {s.label}
            </option>
          ))}
        </select>}

        {/* GENRE 1 */}
        {Boolean(filters.genre?.length) && <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="rk-input w-full rounded-xl px-3 py-2.5 text-sm"
        >
          {filters.genre?.map((g) => (
            <option key={g.value} value={g.value} className="text-black">
              {g.label}
            </option>
          ))}
        </select>}

        {/* GENRE 2 */}
        {Boolean(filters.genre2?.length) && <select
          value={genre2}
          onChange={(e) => setGenre2(e.target.value)}
          className="rk-input w-full rounded-xl px-3 py-2.5 text-sm"
        >
          {filters.genre2?.map((g) => (
            <option key={g.value} value={g.value} className="text-black">
              {g.label}
            </option>
          ))}
        </select>}

      </div>

      {/* 🔥 RESET BUTTON (TIDAK DIUBAH SAMA SEKALI) */}
      <Button
        variant="ghost"
        onClick={() => {
          setOrderby("modified");
          setTipe("");
          setGenre("");
          setGenre2("");
          setStatus("");

          setPage(1);
          setData([]);
          setHasMore(true);

          fetchData(1);
        }}
        className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold"
      >
        Reset
      </Button>
    </div>
  );
}
