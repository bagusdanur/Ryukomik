"use client";

import StatsPanel from "@/components/stats/StatsPanel";

/** Halaman /statistik kini hanya cangkang — panelnya sama dengan tab Statistik di /files. */
export default function StatsPage() {
  return (
    <div className="rk-page rk-app-surface">
      <div className="rk-shell px-4 pt-24 pb-24">
        <StatsPanel />
      </div>
    </div>
  );
}
