import type { ReactNode } from "react";
import AnimeHeader from "@/components/anime/HentaiHeader";
import AgeGate from "@/components/anime/AgeGate";

export default function HentaiLayout({ children }: { children: ReactNode }) {
  return (
    <div className="rk-page">
      <AnimeHeader />
      <AgeGate />
      <main>{children}</main>
    </div>
  );
}
