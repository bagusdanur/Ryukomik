import type { Metadata } from "next";
import JadwalClient from "./JadwalClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Jadwal Rilis Anime Sub Indo",
  description:
    "Jadwal rilis anime sub indo per hari, Senin sampai Minggu. Pantau anime favoritmu dan tonton episode barunya di Ryukomik.",
  alternates: { canonical: "/anime/jadwal" },
  openGraph: {
    title: "Jadwal Rilis Anime Sub Indo",
    description: "Jadwal rilis anime per hari, lengkap dan selalu diperbarui.",
    type: "website",
  },
};

type JadwalAnime = {
  slug?: string;
  thumbnail?: string;
  title?: string;
  status?: string;
  rating?: string;
  episodes?: string | number;
  type?: string;
  releaseTime?: string;
};

type JadwalData = Partial<Record<string, JadwalAnime[]>>;

async function getJadwal(): Promise<JadwalData | null> {
  try {
    const res = await fetch("https://apiv2.ryukomik.com/animeid/jadwal", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: JadwalData };
    return json.success ? json.data ?? null : null;
  } catch {
    return null;
  }
}

export default async function Page() {
  const data = await getJadwal();
  return <JadwalClient initialData={data} />;
}
