import type { Metadata } from "next";
import MarathonClient from "./MarathonClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Marathon Baca — Leaderboard Mingguan & Bulanan | Ryukomik",
  description:
    "Ikuti Marathon Baca Ryukomik: baca sebanyak mungkin chapter tiap minggu dan bulan, naik ke papan peringkat, dan menangkan hadiah premium untuk juara 1-3.",
  alternates: { canonical: "/marathon" },
};

export default function MarathonPage() {
  return (
    <main className="rk-page px-3 pb-28 pt-20 text-white sm:px-5">
      <div className="rk-shell max-w-2xl">
        <MarathonClient />
      </div>
    </main>
  );
}
