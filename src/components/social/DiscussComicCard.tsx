"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { FiArrowRight, FiCheck, FiMessageCircle, FiSend, FiX } from "react-icons/fi";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { socialFetch } from "@/lib/social/client";

type Props = {
  title: string;
  source: string;
  slug: string;
  thumbnail?: string | null;
};

export default function DiscussComicCard({ title, source, slug, thumbnail }: Props) {
  const { user, loading: userLoading } = useSupabaseUser();
  const [open, setOpen] = useState(false);
  const [opinion, setOpinion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const comicUrl = `https://www.ryukomik.my.id/komik/${encodeURIComponent(source)}/${encodeURIComponent(slug)}`;
  const mediaUrl = thumbnail?.startsWith("https://") ? thumbnail : null;
  const content = useMemo(() => {
    const intro = `Lagi baca ${title}`;
    const body = opinion.trim();
    return `${intro}${body ? `\n\n${body}` : ""}\n\n${comicUrl}`.slice(0, 500);
  }, [comicUrl, opinion, title]);

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!user || sending) return;
    setSending(true);
    setError("");
    try {
      const result = await socialFetch<{ post: { id: string } }>("/api/social/posts", {
        method: "POST",
        body: JSON.stringify({ content, image_url: mediaUrl, visibility: "public" }),
      });
      setCreatedId(result.post.id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Diskusi gagal diterbitkan.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <section className="rk-shell mt-5 px-3 sm:mt-6 sm:px-4">
        <div className="relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_13%,var(--surface-1)),color-mix(in_srgb,var(--accent-2)_7%,var(--surface-0)))] p-4 shadow-[0_16px_55px_rgba(0,0,0,.18)] sm:rounded-3xl sm:p-5">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            {thumbnail && (
              <div className="hidden h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/20 sm:block">
                <img src={thumbnail} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/65">RyuSpace</p>
              <h2 className="mt-1 text-base font-black text-white sm:text-lg">Bahas komik ini di komunitas</h2>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45 sm:text-sm">
                Bagikan teori, ulasan, atau rekomendasimu tentang {title} ke pembaca lain.
              </p>
            </div>
            <button
              type="button"
              disabled={userLoading}
              onClick={() => setOpen(true)}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-black transition hover:scale-[1.02] disabled:opacity-50 sm:h-11 sm:px-5"
            >
              <FiMessageCircle /> Bahas <FiArrowRight className="hidden sm:block" />
            </button>
          </div>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
          <button type="button" aria-label="Tutup" onClick={() => setOpen(false)} className="absolute inset-0" />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-3xl border border-white/12 bg-[var(--surface-1)] shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200/60">Posting ke RyuSpace</p>
                <h2 className="mt-0.5 font-black">Bahas {title}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/60 hover:text-white"><FiX /></button>
            </div>

            {createdId ? (
              <div className="p-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-400/15 text-xl text-emerald-300"><FiCheck /></div>
                <h3 className="mt-3 text-lg font-black">Diskusi berhasil diterbitkan</h3>
                <p className="mt-1 text-sm text-white/45">Postinganmu sekarang tampil di timeline komunitas.</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button onClick={() => setOpen(false)} className="rounded-xl border border-white/10 py-3 text-xs font-bold text-white/65">Tetap di sini</button>
                  <Link href={`/post/${createdId}`} className="rounded-xl bg-white py-3 text-xs font-black text-black">Lihat postingan</Link>
                </div>
              </div>
            ) : user ? (
              <form onSubmit={publish} className="p-4">
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/15 p-3">
                  {thumbnail && <img src={thumbnail} alt="" className="h-20 w-14 shrink-0 rounded-lg object-cover" referrerPolicy="no-referrer" />}
                  <div className="min-w-0"><p className="line-clamp-2 text-sm font-black">{title}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-cyan-200/50">{source}</p></div>
                </div>
                <textarea
                  value={opinion}
                  onChange={(event) => setOpinion(event.target.value.slice(0, 360))}
                  disabled={sending}
                  rows={5}
                  autoFocus
                  placeholder="Tulis pendapat, teori, atau alasan kamu merekomendasikan komik ini..."
                  className="rk-input mt-3 w-full resize-none rounded-2xl p-4 text-sm"
                />
                <div className="mt-1 flex justify-between text-[10px] text-white/30"><span>Judul dan tautan komik ditambahkan otomatis</span><span>{opinion.length}/360</span></div>
                {error && <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200">{error}</p>}
                <button disabled={sending} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-black text-black disabled:opacity-50"><FiSend className={sending ? "animate-pulse" : ""} />{sending ? "Menerbitkan..." : "Terbitkan diskusi"}</button>
              </form>
            ) : (
              <div className="p-6 text-center">
                <h3 className="font-black">Masuk untuk ikut berdiskusi</h3>
                <p className="mt-2 text-sm text-white/45">Gunakan akun Ryukomik kamu untuk membuat postingan komunitas.</p>
                <Link href="/setting" className="mt-5 block rounded-xl bg-white py-3 text-sm font-black text-black">Masuk ke akun</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
