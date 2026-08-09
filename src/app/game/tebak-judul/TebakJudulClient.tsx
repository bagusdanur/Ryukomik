"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FaCheck, FaCrown, FaFire, FaMedal, FaRedoAlt, FaTimes, FaTrophy } from "react-icons/fa";
import { FiArrowRight, FiAward, FiBarChart2, FiCheckSquare, FiClock, FiHome, FiRefreshCw, FiTarget, FiZap } from "react-icons/fi";

const ROUND_LIMIT = 10;
const OPTION_COUNT = 4;
const MIN_PAGE = 1;
const MAX_PAGE = 24;
const RESTART_COOLDOWN_SECONDS = 60 * 60;
const RESTART_COOLDOWN_KEY = "ryukomik-title-rush-restart-at";

const EVENT_TITLE = "Ryukomik Title Rush";
const EVENT_SUBTITLE = "Weekly Leaderboard";

const prizes = [
  { rank: "Juara 1", reward: "Premium 7 Hari", icon: FaCrown },
  { rank: "Juara 2", reward: "Premium 5 Hari", icon: FaTrophy },
  { rank: "Juara 3", reward: "Premium 3 Hari", icon: FaMedal },
];

const eventFlow = [
  { text: "Mainkan 10 soal cover komik.", icon: FiCheckSquare },
  { text: "Poin benar akan ditambahkan ke total mingguan.", icon: FiBarChart2 },
  { text: "Pemenang mingguan mendapat hadiah premium.", icon: FiAward },
];

type RawComicItem = {
  title?: string;
  image?: string;
  thumbnail?: string;
  cover?: string;
  slug?: string;
  link?: string;
  source?: string;
  type_genre?: string;
  type?: string;
  genre?: string;
  chapter_terbaru?: string;
  chapter_awal?: string;
};

type InitialData =
  | RawComicItem[]
  | {
      manga?: RawComicItem[];
      manhwa?: RawComicItem[];
      manhua?: RawComicItem[];
    };

type GameItem = {
  title: string;
  image: string;
  slug: string;
  source: string;
  type: string;
  chapter: string;
};

type Question = {
  answer: GameItem;
  options: string[];
};

type TebakJudulClientProps = {
  initialData?: InitialData | null;
  currentPage: number;
  eventEnabled?: boolean;
};

type SubmitState =
  | { status: "idle"; message: "" }
  | { status: "saving"; message: "Menyimpan skor..." }
  | { status: "saved"; message: string }
  | { status: "skipped"; message: string }
  | { status: "error"; message: string };

const getRandomPage = (currentPage: number) => {
  if (MAX_PAGE <= MIN_PAGE) return MIN_PAGE;

  let page = currentPage;

  while (page === currentPage) {
    page = Math.floor(Math.random() * (MAX_PAGE - MIN_PAGE + 1)) + MIN_PAGE;
  }

  return page;
};

const slugFromLink = (url = "") => {
  const parts = String(url).split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
};

const normalizeType = (value?: string) => {
  if (!value) return "Komik";

  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
};

const normalizeItem = (item: RawComicItem, source = "komikid"): GameItem | null => {
  const title = item?.title?.trim();
  const image = item?.image || item?.thumbnail || item?.cover;
  const slug = item?.slug || slugFromLink(item?.link);

  if (!title || !image || !slug) return null;

  return {
    title,
    image,
    slug,
    source: item?.source || source,
    type: normalizeType(item?.type_genre || item?.type || item?.genre),
    chapter: item?.chapter_terbaru || item?.chapter_awal || "",
  };
};

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
};

const uniqueByTitle = (items: GameItem[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function buildQuestion(pool: GameItem[], selectedAnswer?: GameItem): Question | null {
  if (pool.length < OPTION_COUNT) return null;

  const answer = selectedAnswer || pool[Math.floor(Math.random() * pool.length)];
  const wrongOptions = shuffle(pool.filter((item) => item.title !== answer.title))
    .slice(0, OPTION_COUNT - 1);
  const options = shuffle([answer, ...wrongOptions]).map((item) => item.title);

  return {
    answer,
    options,
  };
}

export default function TebakJudulClient({
  initialData,
  currentPage,
  eventEnabled = true,
}: TebakJudulClientProps) {
  const router = useRouter();
  const pool = useMemo(() => {
    const groups = Array.isArray(initialData)
      ? initialData
      : [
          ...(initialData?.manga || []),
          ...(initialData?.manhwa || []),
          ...(initialData?.manhua || []),
        ];

    return uniqueByTitle(
      groups.map((item) => normalizeItem(item)).filter(Boolean),
    );
  }, [initialData]);

  const [selected, setSelected] = useState("");
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "",
  });
  const [submittedRun, setSubmittedRun] = useState(false);
  const [restartCooldown, setRestartCooldown] = useState(0);
  const questions = useMemo(() => {
    const answers = shuffle(pool).slice(0, ROUND_LIMIT);

    return answers.map((answer) => buildQuestion(pool, answer)).filter(Boolean);
  }, [pool]);

  const gameLimit = Math.min(ROUND_LIMIT, questions.length || ROUND_LIMIT);
  const isFinished = round > gameLimit;
  const question = questions[round - 1] || null;
  const isCorrect = selected === question?.answer?.title;
  const restartDisabled = restartCooldown > 0;

  useEffect(() => {
    const updateCooldown = () => {
      const until = Number(localStorage.getItem(RESTART_COOLDOWN_KEY) || 0);
      setRestartCooldown(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    };

    updateCooldown();
    const timer = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isFinished) return;

    const getCooldown = () => {
      const now = Date.now();
      const storedUntil = Number(localStorage.getItem(RESTART_COOLDOWN_KEY) || 0);
      const until =
        storedUntil > now
          ? storedUntil
          : now + RESTART_COOLDOWN_SECONDS * 1000;

      localStorage.setItem(RESTART_COOLDOWN_KEY, String(until));
      return Math.max(0, Math.ceil((until - now) / 1000));
    };

    const firstTick = window.setTimeout(() => {
      setRestartCooldown(getCooldown());
    }, 0);
    const timer = window.setInterval(() => {
      const until = Number(localStorage.getItem(RESTART_COOLDOWN_KEY) || 0);
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setRestartCooldown(remaining);

      if (remaining <= 0) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(timer);
    };
  }, [isFinished]);

  useEffect(() => {
    if (!isFinished || submittedRun) return;

    let active = true;

    async function submitScore() {
      setSubmitState({ status: "saving", message: "Menyimpan skor..." });

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        if (active) {
          setSubmitState({
            status: "skipped",
            message: "Login diperlukan agar skor masuk leaderboard.",
          });
          setSubmittedRun(true);
        }
        return;
      }

      const res = await fetch("/api/game/title-rush/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          score,
          total_rounds: gameLimit,
          best_streak: bestStreak,
          source_page: currentPage,
        }),
      });
      const json = await res.json();

      if (!active) return;

      if (!res.ok) {
        setSubmitState({
          status: "error",
          message: json?.error || "Skor belum bisa disimpan.",
        });
      } else {
        setSubmitState({
          status: json?.saved ? "saved" : "skipped",
          message: json?.message || "Skor selesai diproses.",
        });
      }
      setSubmittedRun(true);
    }

    submitScore();

    return () => {
      active = false;
    };
  }, [bestStreak, currentPage, gameLimit, isFinished, score, submittedRun]);

  const restart = () => {
    if (restartDisabled) return;

    router.push(`/game/tebak-judul?page=${getRandomPage(currentPage)}`);
  };

  const chooseAnswer = (title: string) => {
    if (answered || isFinished || !question) return;

    const correct = title === question.answer.title;
    const nextStreak = correct ? streak + 1 : 0;

    setSelected(title);
    setAnswered(true);
    setScore((value) => value + (correct ? 1 : 0));
    setStreak(nextStreak);
    setBestStreak((value) => Math.max(value, nextStreak));
  };

  const continueGame = () => {
    if (round >= questions.length) {
      setRound(gameLimit + 1);
      return;
    }

    setRound((value) => value + 1);
    setSelected("");
    setAnswered(false);
  };

  if (!eventEnabled) {
    return (
      <main className="rk-page px-4 py-8 text-white">
        <div className="rk-card mx-auto max-w-xl rounded-lg p-5 text-center">
          <p className="text-lg font-semibold">Event ditutup sementara</p>
          <p className="mt-2 text-sm text-white/60">
            Title Rush sedang dihentikan dulu oleh admin. Nanti bisa dibuka lagi.
          </p>
          <Link
            href="/game"
            className="rk-btn-primary mt-5 inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-bold"
          >
            Kembali ke Game
          </Link>
        </div>
      </main>
    );
  }

  if (pool.length < OPTION_COUNT) {
    return (
      <main className="rk-page px-4 py-8 text-white">
        <div className="rk-card mx-auto max-w-xl rounded-lg p-5 text-center">
          <p className="text-lg font-semibold">Data belum cukup</p>
          <p className="mt-2 text-sm text-white/60">
            Event butuh minimal empat komik dengan judul dan cover.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="rk-page px-3 pb-28 pt-3 text-white sm:px-4 sm:pt-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
          <Link
            href="/game"
            className="rk-btn-ghost inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            aria-label="Kembali ke halaman game"
          >
            <FiHome />
          </Link>

          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5 text-center text-[10px] sm:max-w-md sm:gap-2 sm:text-sm">
            <div className="rk-card-soft rounded-lg px-2 py-1.5 sm:py-2">
              <FiTarget className="mx-auto mb-0.5 text-[var(--accent-2)] sm:mb-1" />
              <p className="text-white/50">Skor</p>
              <p className="font-bold">{score}</p>
            </div>
            <div className="rk-card-soft rounded-lg px-2 py-1.5 sm:py-2">
              <FiCheckSquare className="mx-auto mb-0.5 text-[var(--accent-2)] sm:mb-1" />
              <p className="text-white/50">Soal</p>
              <p className="font-bold">
                {Math.min(round, gameLimit)}/{gameLimit}
              </p>
            </div>
            <div className="rk-card-soft rounded-lg px-2 py-1.5 sm:py-2">
              <FiZap className="mx-auto mb-0.5 text-[var(--accent-2)] sm:mb-1" />
              <p className="text-white/50">Streak</p>
              <p className="font-bold">{streak}</p>
            </div>
          </div>
        </div>

        <section className="rk-card mb-4 hidden overflow-hidden rounded-lg sm:block">
          <div className="grid gap-4 border-b border-white/[.08] bg-[var(--surface-2)] p-4 sm:grid-cols-[minmax(0,1fr)_280px] sm:p-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent-2)]/25 bg-[var(--accent-2)]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-[var(--accent-2)]">
                <FaFire />
                {EVENT_SUBTITLE}
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <h1 className="text-[28px] font-black leading-tight sm:text-4xl">
                  {EVENT_TITLE}
                </h1>
                <Link
                  href="/game/tebak-judul/leaderboard"
                  className="rk-btn-ghost inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold sm:w-auto"
                >
                  <FiBarChart2 />
                  Leaderboard
                </Link>
              </div>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/62">
                Tebak judul dari cover komik. Leaderboard mingguan memakai
                total poin dari semua sesi bermain.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {prizes.map((prize) => {
                  const Icon = prize.icon;

                  return (
                    <div
                      key={prize.rank}
                      className="rk-card-soft flex items-center gap-3 rounded-lg px-3 py-2"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/[.08] bg-white/[.04] text-[var(--accent-2)]">
                        <Icon />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                          {prize.rank}
                        </p>
                        <p className="truncate text-xs font-black text-white">
                          {prize.reward}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rk-card-soft rounded-lg p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-black">
                <FiTarget className="text-[var(--accent-2)]" />
                Alur Event
              </div>
              <div className="space-y-2">
                {eventFlow.map((step, index) => {
                  const Icon = step.icon;

                  return (
                  <div key={step.text} className="flex gap-2 text-xs leading-5 text-white/65">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[.06] text-[10px] font-black text-[var(--accent-2)]">
                      <Icon size={13} />
                    </span>
                    <span>{step.text}</span>
                  </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-md border border-white/[.08] bg-white/[.04] px-3 py-2 text-xs text-white/55">
                <FiClock className="shrink-0 text-[var(--accent-2)]" />
                Reset setiap Senin pukul 00:00 WIB.
              </div>
            </div>
          </div>
        </section>

        <div className="rk-card-soft mb-2 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[11px] sm:hidden">
          <span className="min-w-0 truncate font-black text-white">
            Title Rush · 10 soal
          </span>
          <Link
            href="/game/tebak-judul/leaderboard"
            className="shrink-0 font-bold text-[var(--accent-2)]"
          >
            Rank
          </Link>
        </div>

        {restartCooldown > 0 && !isFinished && (
          <div className="mb-2 rounded-lg border border-[var(--accent-2)]/20 bg-[var(--accent-2)]/10 px-3 py-2 text-center text-[11px] font-semibold text-[var(--accent-2)] sm:hidden">
            Main lagi tersedia dalam {Math.ceil(restartCooldown / 60)} menit.
          </div>
        )}

        <section className="rk-card overflow-hidden rounded-lg">
          <div className="h-1.5 bg-white/10">
            <div
              className="h-full bg-[var(--accent)]"
              style={{
                width: `${(Math.min(round, gameLimit) / gameLimit) * 100}%`,
              }}
            />
          </div>

          <div className="grid gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
            <div className="relative border-b border-white/10 bg-[var(--surface-0)] p-2.5 md:border-b-0 md:border-r md:p-4">
              {question?.answer && (
                <div className="mx-auto max-w-[138px] sm:max-w-[188px] md:max-w-[200px]">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-white/10 bg-[var(--surface-1)]">
                    <img
                      src={question.answer.image}
                      alt="Thumbnail komik untuk ditebak"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      <span className="rk-chip rounded-full px-2 py-1 text-[11px] font-bold">
                        {question.answer.type}
                      </span>
                      {question.answer.chapter && (
                        <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/75">
                          {question.answer.chapter}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-center text-[11px] leading-4 text-white/50 sm:mt-2 sm:text-xs sm:leading-5">
                      Pilih judul yang cocok dengan cover ini.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-5">
              {isFinished ? (
                <div className="flex min-h-[320px] flex-col justify-center">
                  <p className="text-sm font-black uppercase tracking-[.18em] text-[var(--accent-2)]">
                    Selesai
                  </p>
                  <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                    Skor {score}/{gameLimit}
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-white/60">
                    Best streak: {bestStreak}. Poin benar dari sesi ini akan
                    ditambahkan ke total leaderboard mingguan.
                  </p>
                  {submitState.status !== "idle" && (
                    <div
                      className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                        submitState.status === "error"
                          ? "border-[var(--accent-3)]/25 bg-[var(--accent-3)]/10 text-[var(--accent-3)]"
                          : "border-[var(--accent-2)]/25 bg-[var(--accent-2)]/10 text-[var(--accent-2)]"
                      }`}
                    >
                      {submitState.message}
                    </div>
                  )}
                  <div className="mt-4 grid gap-2 text-sm">
                    <div className="rk-card-soft rounded-lg px-3 py-2">
                      Juara 1 mendapatkan Premium 7 Hari.
                    </div>
                    <div className="rk-card-soft rounded-lg px-3 py-2">
                      Juara 2 mendapatkan Premium 5 Hari.
                    </div>
                    <div className="rk-card-soft rounded-lg px-3 py-2">
                      Juara 3 mendapatkan Premium 3 Hari.
                    </div>
                  </div>
                  <button
                    onClick={restart}
                    disabled={restartDisabled}
                    className="rk-btn-primary mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaRedoAlt />
                    {restartDisabled
                      ? `Main lagi ${Math.ceil(restartCooldown / 60)} menit`
                      : "Main lagi"}
                  </button>
                  <Link
                    href="/game/tebak-judul/leaderboard"
                    className="rk-btn-ghost mt-3 inline-flex h-12 w-full items-center justify-center rounded-lg px-5 text-sm font-bold"
                  >
                    Lihat leaderboard
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--accent-2)]">
                      Soal Cover
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/70">
                      <FaFire className="text-[var(--accent-3)]" />
                      Page {currentPage}
                    </span>
                  </div>
                  <h1 className="mt-1.5 text-[19px] font-black leading-tight sm:mt-2 sm:text-3xl">
                    Judul komik ini yang mana?
                  </h1>

                  <div className="mt-3 grid gap-2 sm:mt-6 sm:gap-3">
                    {question?.options.map((title) => {
                      const correctOption = answered && title === question.answer.title;
                      const wrongOption = answered && selected === title && !correctOption;

                      return (
                        <button
                          key={title}
                          onClick={() => chooseAnswer(title)}
                          disabled={answered}
                          className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-[12px] font-semibold leading-snug transition-colors duration-200 sm:min-h-14 sm:px-4 sm:py-3 sm:text-sm ${
                            correctOption
                              ? "border-green-400/70 bg-green-500/20 text-green-100"
                              : wrongOption
                                ? "border-red-400/70 bg-red-500/20 text-red-100"
                                : "border-white/10 bg-white/[0.06] text-white active:scale-[0.99] hover:bg-white/[0.1]"
                          }`}
                        >
                          <span className="line-clamp-2">{title}</span>
                          {correctOption && <FaCheck className="shrink-0" />}
                          {wrongOption && <FaTimes className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {answered && (
                    <p className="rk-card-soft mt-4 rounded-lg px-3 py-2 text-sm text-white/70">
                      {isCorrect ? "Benar." : "Kurang tepat."} Jawaban:{" "}
                      <span className="font-semibold text-white">
                        {question.answer.title}
                      </span>
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {answered && !isFinished && question?.answer && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-[var(--background)] px-3 py-3 text-white">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <button
              onClick={continueGame}
              className="rk-btn-primary inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold"
            >
              Lanjut
              <FiArrowRight />
            </button>
            <button
              onClick={restart}
              className="rk-btn-ghost inline-flex h-12 w-12 items-center justify-center rounded-lg"
              aria-label="Restart game"
            >
              <FiRefreshCw />
            </button>
            <Link
              href={`/komik/${question.answer.source}/${question.answer.slug}`}
              className="rk-btn-ghost inline-flex h-12 flex-1 items-center justify-center rounded-lg px-3 text-sm font-semibold"
            >
              Buka komik
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
