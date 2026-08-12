import type { Metadata } from "next";
import PublicCollectionClient from "./PublicCollectionClient";

export const metadata: Metadata = { title: "Koleksi Komunitas | Ryukomik" };
export default async function PublicCollectionPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <main className="rk-page px-3 pb-28 pt-6 text-white sm:px-5 sm:pt-16"><div className="rk-shell max-w-5xl"><PublicCollectionClient id={id}/></div></main>; }
