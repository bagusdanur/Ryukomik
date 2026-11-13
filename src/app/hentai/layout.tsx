import type { ReactNode } from "react";
import { redirect } from "next/navigation";

export default async function HentaiLayout({ children }: { children: ReactNode }) {
  // Halaman hentai disimpan di codebase namun dinonaktifkan dari tampilan publik.
  void children;
  redirect("/tonton");
}
