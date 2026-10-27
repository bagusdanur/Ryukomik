import type { ReactNode } from "react";
import TontonHeader from "@/components/anime/TontonHeader";

export default function TontonLayout({ children }: { children: ReactNode }) {
  return (
    <div className="rk-page">
      <TontonHeader />
      <main>{children}</main>
    </div>
  );
}
