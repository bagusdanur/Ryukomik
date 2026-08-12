import type { Metadata } from "next";
import PostDetailClient from "./PostDetailClient";

export const metadata: Metadata = { title: "Posting Komunitas | Ryukomik" };
export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="rk-page px-3 pb-28 pt-6 text-white sm:px-5 sm:pt-16"><div className="rk-shell max-w-2xl"><PostDetailClient id={id}/></div></main>;
}
