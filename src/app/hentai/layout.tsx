import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AnimeHeader from "@/components/anime/HentaiHeader";
import AgeGate from "@/components/anime/AgeGate";
import { adultContentHidden } from "@/lib/adultPrefServer";

export default async function HentaiLayout({ children }: { children: ReactNode }) {
  // Filter 18+ aktif: seluruh area hentai dialihkan, bukan sekadar disembunyikan.
  if (await adultContentHidden()) redirect("/tonton");

  return (
    <div className="rk-page">
      <AnimeHeader />
      <AgeGate />
      <main>{children}</main>
    </div>
  );
}
