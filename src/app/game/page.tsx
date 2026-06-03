import type { Metadata } from "next";
import Link from "next/link";
import TitleRushWinnerBadge from "@/components/TitleRushWinnerBadge";
import { getTitleRushEventStatus } from "@/lib/titleRushEvent";
import { FaCrown, FaGamepad, FaMedal, FaTrophy } from "react-icons/fa";
import { FiArrowRight, FiBarChart2, FiCheckSquare, FiClock, FiGrid, FiHome, FiImage, FiShuffle, FiZap } from "react-icons/fi";

export const metadata: Metadata = {
  title: "Game - Ryukomik",
  description: "Kumpulan mini game Ryukomik.",
};

export const revalidate = 300;

const games = [
  {
    title: "Ryukomik Title Rush",
    href: "/game/tebak-judul",
    category: "Weekly",
    rounds: "10 soal",
    choices: "4 pilihan",
    batch: "Acak",
    description:
      "Tebak judul komik dari cover dan kejar peringkat leaderboard mingguan.",
    icon: FiImage,
    accent: "bg-[var(--accent)]",
    status: "Main event",
  },
];

const upcomingGames = [
  "Genre Rush",
  "Chapter Hunt",
  "Cover Clash",
];

const rewards = [
  { rank: "Juara 1", prize: "Premium 7 hari", icon: FaCrown },
  { rank: "Juara 2", prize: "Premium 5 hari", icon: FaTrophy },
  { rank: "Juara 3", prize: "Premium 3 hari", icon: FaMedal },
];

export default async function GamePage() {
  const eventStatus = await getTitleRushEventStatus();
  const eventEnabled = eventStatus.enabled;
  const featured = games[0];
  const FeaturedIcon = featured.icon;

  return (
    <main className="rk-page px-4 pb-24 pt-5 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="rk-btn-ghost inline-flex h-10 w-10 items-center justify-center rounded-lg"
            aria-label="Kembali ke beranda"
          >
            <FiHome />
          </Link>
          <div className="rk-chip inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold">
            <FaGamepad className="text-[var(--accent-2)]" />
            Ryukomik Games
          </div>
        </div>

        <section className="rk-card overflow-hidden rounded-lg">
          <div className="border-b border-white/[.08] bg-[var(--surface-2)] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent-2)]">
                  Event Mingguan
                </p>
                <h1 className="mt-2 max-w-[320px] text-2xl font-black leading-tight sm:text-3xl">
                  {featured.title}
                </h1>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[.05] text-2xl text-[var(--accent-2)]">
                <FeaturedIcon />
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {rewards.map((reward, index) => {
                const RewardIcon = reward.icon;
                const rank = (index + 1) as 1 | 2 | 3;

                return (
                  <div
                    key={reward.rank}
                    className="flex items-center gap-3 rounded-lg border border-white/[.08] bg-[var(--surface-1)] px-3 py-2.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[.06] text-[var(--accent-2)]">
                      <RewardIcon />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wide text-white/45">
                        {reward.rank}
                      </p>
                      <p className="truncate text-xs font-bold text-white/80">
                        {reward.prize}
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[10px] font-bold text-white/35">
                          + Badge
                        </span>
                        <TitleRushWinnerBadge rank={rank} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <p className="text-sm leading-6 text-white/65">
              {featured.description}
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/55">
              <FiClock className="shrink-0 text-[var(--accent-2)]" />
              Satu sesi per jam. Skor mingguan tetap ditotal.
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rk-card-soft rounded-lg px-2 py-3">
                <FiCheckSquare className="mx-auto mb-1 text-[var(--accent-2)]" />
                <p className="font-bold">{featured.rounds}</p>
                <p className="mt-1 text-white/45">Soal</p>
              </div>
              <div className="rk-card-soft rounded-lg px-2 py-3">
                <FiGrid className="mx-auto mb-1 text-[var(--accent-2)]" />
                <p className="font-bold">{featured.choices}</p>
                <p className="mt-1 text-white/45">Pilihan</p>
              </div>
              <div className="rk-card-soft rounded-lg px-2 py-3">
                <FiShuffle className="mx-auto mb-1 text-[var(--accent-2)]" />
                <p className="font-bold">{featured.batch}</p>
                <p className="mt-1 text-white/45">Batch</p>
              </div>
            </div>

            <Link
              href={eventEnabled ? featured.href : "/game"}
              aria-disabled={!eventEnabled}
              className={`mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-black ${
                eventEnabled
                  ? "rk-btn-primary"
                  : "cursor-not-allowed border border-white/[.08] bg-white/[.06] text-white/35"
              }`}
            >
              {eventEnabled ? featured.status : "Event ditutup sementara"}
              {eventEnabled && <FiArrowRight />}
            </Link>
            <Link
              href="/game/tebak-judul/leaderboard"
              className="rk-btn-ghost mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold"
            >
              <FiBarChart2 />
              Lihat leaderboard event
            </Link>
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black">Semua Game</h2>
            <span className="text-xs text-white/45">{games.length} aktif</span>
          </div>

          <div className="grid gap-3">
            {games.map((game) => {
              const Icon = game.icon;

              return (
                <Link
                  key={game.href}
                  href={eventEnabled ? game.href : "/game"}
                  aria-disabled={!eventEnabled}
                  className={`rk-card-soft flex items-center gap-3 rounded-lg p-3 active:scale-[0.99] ${
                    eventEnabled ? "" : "pointer-events-none opacity-60"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${game.accent} text-xl`}
                  >
                    <Icon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-black">
                        {game.title}
                      </p>
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                        {game.category}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-white/50">
                      {game.description}
                    </p>
                  </div>
                  {eventEnabled ? (
                    <FiArrowRight className="shrink-0 text-white/45" />
                  ) : (
                    <span className="shrink-0 rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-white/45">
                      OFF
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rk-card-soft mt-5 rounded-lg p-4">
          <div className="mb-3 flex items-center gap-2">
            <FiZap className="text-[var(--accent-2)]" />
            <h2 className="text-sm font-black">Segera Hadir</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingGames.map((game) => (
              <span
                key={game}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60"
              >
                {game}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
