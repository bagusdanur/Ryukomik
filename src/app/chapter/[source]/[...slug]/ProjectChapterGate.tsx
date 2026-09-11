"use client";

import { useEffect, useState } from "react";
import { FiClock, FiLock } from "react-icons/fi";
import LoginModal from "@/components/LoginModal";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { supabase } from "@/lib/supabaseClient";
import type { ReaderChapter } from "@/types/content";
import ChapterClient from "./ChapterClient";

type Props = { initialData: ReaderChapter; source: string; slugStr: string };

export default function ProjectChapterGate({ initialData, source, slugStr }: Props) {
  const { user, loading } = useSupabaseUser();
  const [data, setData] = useState(initialData);
  const [token, setToken] = useState<string>();
  const [showLogin, setShowLogin] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const lockUntil = data.lockUntil ? new Date(data.lockUntil).getTime() : 0;
  const locked = Boolean(data.locked && lockUntil > now);

  useEffect(() => {
    if (!locked) return;
    const timer = window.setInterval(() => {
      const nextNow = Date.now();
      setNow(nextNow);
      if (lockUntil <= nextNow) window.location.reload();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockUntil, locked]);

  useEffect(() => {
    if (loading || !data.locked) return;
    const parts = slugStr.split("/");
    const mangaSlug = parts[0];
    const chapter = parts.at(-1) || "";
    let cancelled = false;
    const load = async () => {
      try {
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;
        const lockExpired = lockUntil <= Date.now();
        if (!lockExpired && (!user || !accessToken)) {
          setShowLogin(true);
          return;
        }
        const response = await fetch(`/api/project/chapter/${encodeURIComponent(mangaSlug)}/${encodeURIComponent(chapter)}`, {
          cache: "no-store",
          headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || "Chapter gagal dibuka");
        if (!cancelled) { setData(payload); setToken(accessToken); setShowLogin(false); }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Chapter gagal dibuka");
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [data.locked, loading, lockUntil, slugStr, user]);

  if (!locked || !data.locked) {
    return <ChapterClient data={data} source={source} slugStr={slugStr} imageAccessToken={token} />;
  }

  const seconds = Math.max(0, Math.ceil((lockUntil - now) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 text-white">
      <section className="rk-card w-full max-w-lg rounded-3xl p-6 text-center sm:p-8">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-300"><FiLock size={28} /></span>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Chapter baru</p>
        <h1 className="mt-2 text-xl font-black">Login untuk membaca lebih awal</h1>
        <p className="mt-2 text-sm leading-6 text-white/55">Chapter ini khusus pengguna yang sudah login selama 3 jam pertama. Setelah waktunya habis, semua pengunjung dapat membacanya.</p>
        <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-lg font-bold"><FiClock className="text-cyan-300" />{hours.toString().padStart(2,"0")}:{minutes.toString().padStart(2,"0")}:{secs.toString().padStart(2,"0")}</div>
        {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
        <button type="button" onClick={() => setShowLogin(true)} className="rk-btn-primary mt-6 w-full rounded-2xl px-5 py-3 text-sm font-black">Masuk dan baca sekarang</button>
      </section>
      {showLogin && !user && <LoginModal close={() => setShowLogin(false)} />}
    </main>
  );
}
