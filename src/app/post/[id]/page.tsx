import type { Metadata } from "next";
import PostDetailClient from "./PostDetailClient";

export const metadata: Metadata = { title: "Postingan Komunitas | Ryukomik" };
export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="rk-page min-h-dvh px-0 pb-32 pt-16 text-white sm:px-5 sm:pt-24"><div className="rk-shell max-w-3xl"><PostDetailClient id={id}/></div></main>;
}
