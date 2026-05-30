import type { ReactNode } from "react";
import DonghuaHeader from "@/components/anime/DonghuaHeader";

export default function DonghuaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="rk-page">
      <DonghuaHeader />
      <main>{children}</main>
    </div>
  );
}
