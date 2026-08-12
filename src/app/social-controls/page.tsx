import type { Metadata } from "next";
import SocialControlsClient from "./SocialControlsClient";

export const metadata: Metadata = { title: "Kontrol Sosial | Ryukomik" };

export default function SocialControlsPage() {
  return <main className="rk-page px-3 pb-28 pt-6 text-white sm:px-5 sm:pt-16"><div className="rk-shell max-w-3xl"><p className="rk-kicker">PRIVASI KOMUNITAS</p><h1 className="rk-heading mt-1">Kontrol sosial</h1><p className="mt-1 text-sm text-white/45">Kelola akun yang diblokir, dibisukan, dan notifikasi yang ingin diterima.</p><SocialControlsClient /></div></main>;
}
