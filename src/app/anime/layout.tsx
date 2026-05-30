import type { ReactNode } from "react";
import AnimeHeader from "@/components/anime/AnimeHeader";

export default function AnimeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="rk-page">
      <AnimeHeader />
      <main>{children}</main>
    </div>
  );
}
