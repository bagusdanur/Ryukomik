"use client";

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiClock, FiLock } from 'react-icons/fi';
import LoginModal from '@/components/LoginModal';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { supabase } from '@/lib/supabaseClient';
import type { ReaderChapter } from '@/types/content';
import ChapterClient from './ChapterClient';

type Props = { initialData: ReaderChapter; source: string; slugStr: string };
export default function ProjectChapterGate({ initialData, source, slugStr }: Props) {
  const { user, loading } = useSupabaseUser();
  const { isPremium, premiumUntil, loading: premiumLoading } = usePremiumStatus();
  const [data, setData] = useState(initialData);
  const [token, setToken] = useState<string>();
  const [showLogin, setShowLogin] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const inflight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const lockUntil = data.lockUntil ? Date.parse(data.lockUntil) : 0;
  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    const abort = new AbortController();
    controller.current = abort;
    try {
      const session = await supabase.auth.getSession();
      if (abort.signal.aborted) return;
      const accessToken = session.data.session?.access_token;
      const [slug] = slugStr.split('/');
      const chapter = slugStr.split('/').at(-1) || '';
      const response = await fetch(`/api/project/chapter/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`, {
        cache: 'no-store', signal: abort.signal,
        headers: { ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}), ...(isPremium ? { 'x-refresh-premium': 'true' } : {}) },
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Chapter gagal dibuka.');
      if (!abort.signal.aborted) { setData(payload); setToken(accessToken); setError(''); }
    } catch (cause) {
      if (!abort.signal.aborted) { setError(cause instanceof Error ? cause.message : 'Chapter gagal dibuka.'); setData(current => ({ ...current, locked: true, images: [] })); }
    } finally { if (controller.current === abort) { inflight.current = false; controller.current = null; } }
  }, [slugStr, isPremium]);

  useEffect(() => {
    if (loading || premiumLoading) return;
    void refresh();
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { document.removeEventListener('visibilitychange', visible); controller.current?.abort(); controller.current = null; inflight.current = false; };
  }, [loading, premiumLoading, user?.id, premiumUntil, refresh]);

  useEffect(() => {
    if (!lockUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    let expiry: number;
    const schedule = () => {
      const remaining = lockUntil - Date.now() + 100;
      expiry = window.setTimeout(() => { if (remaining > 2147483647) schedule(); else void refresh(); }, Math.max(0, Math.min(remaining, 2147483647)));
    };
    schedule();
    return () => { window.clearInterval(timer); window.clearTimeout(expiry); };
  }, [lockUntil, refresh]);

  if (!data.locked && !error) return <ChapterClient data={data} source={source} slugStr={slugStr} imageAccessToken={token} />;
  const seconds = Math.max(0, Math.ceil((lockUntil - now) / 1000));
  const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), minutes = Math.floor(seconds % 3600 / 60);
  return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 text-white">
    <section className="rk-card w-full max-w-lg rounded-3xl p-6 text-center sm:p-8">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-300"><FiLock size={28} /></span>
      <h1 className="mt-5 text-xl font-black">{error ? 'Chapter belum dapat dibuka' : 'Chapter ini khusus premium'}</h1>
      <p className="mt-3 text-sm leading-6 text-white/55">Premium aktif dapat membaca selama masa lock. Setelah waktunya habis, chapter gratis untuk semua pengunjung.</p>
      {lockUntil > 0 && <><div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 font-mono text-lg"><FiClock />{days} hari {hours} jam {minutes} menit</div><p className="mt-3 text-xs text-white/50">Dibuka {new Date(lockUntil).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p></>}
      {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
      {seconds === 0 && !error && <p className="mt-3 text-xs text-white/50">Memeriksa akses terbaru...</p>}
      <div className="mt-6 flex flex-col gap-3">
        {!user && <button type="button" onClick={() => setShowLogin(true)} className="rk-btn-primary rounded-2xl px-5 py-3 text-sm font-black">Login</button>}
        <Link href="/premium" className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-black">{user ? 'Aktifkan Premium' : 'Lihat Premium'}</Link>
        <button type="button" onClick={() => void refresh()} className="text-xs text-white/60">Periksa akses lagi</button>
      </div>
    </section>
    {showLogin && !user && <LoginModal close={() => setShowLogin(false)} />}
  </main>;
}
