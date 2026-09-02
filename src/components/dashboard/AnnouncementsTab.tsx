"use client";

import { useCallback, useEffect, useState } from "react";
import { FiBell, FiCheckCircle, FiEye, FiLoader, FiPauseCircle, FiPlayCircle, FiSend, FiTrash2 } from "react-icons/fi";

type Announcement = {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  audience: "all" | "free" | "premium";
  is_active: boolean;
  published_at: string;
  expires_at?: string | null;
  created_at: string;
  read_count: number;
};

type Props = { getAdminToken: () => Promise<string | null> };

export default function AnnouncementsTab({ getAdminToken }: Props) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState<"all" | "free" | "premium">("all");
  const [expiresAt, setExpiresAt] = useState("");

  const adminFetch = useCallback(async (init?: RequestInit) => {
    const token = await getAdminToken();
    if (!token) throw new Error("Sesi admin tidak tersedia.");
    return fetch("/api/admin/announcements", {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
    });
  }, [getAdminToken]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminFetch();
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal memuat pengumuman.");
      setItems(json.items || []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gagal memuat pengumuman.");
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true); setNotice("");
    try {
      const response = await adminFetch({
        method: "POST",
        body: JSON.stringify({ title, message, link: link || null, audience, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal mengirim pengumuman.");
      setTitle(""); setMessage(""); setLink(""); setExpiresAt(""); setAudience("all");
      setNotice("Pengumuman berhasil dikirim dan sudah tersedia di notifikasi pengguna.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gagal mengirim pengumuman.");
    } finally {
      setSending(false);
    }
  }

  async function toggle(item: Announcement) {
    setBusyId(item.id); setNotice("");
    try {
      const response = await adminFetch({ method: "PATCH", body: JSON.stringify({ id: item.id, isActive: !item.is_active }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal mengubah pengumuman.");
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_active: !item.is_active } : entry));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gagal mengubah pengumuman.");
    } finally { setBusyId(null); }
  }

  async function remove(item: Announcement) {
    if (!window.confirm(`Hapus pengumuman “${item.title}”? Status baca pengguna juga akan dihapus.`)) return;
    setBusyId(item.id); setNotice("");
    try {
      const response = await adminFetch({ method: "DELETE", body: JSON.stringify({ id: item.id }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal menghapus pengumuman.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gagal menghapus pengumuman.");
    } finally { setBusyId(null); }
  }

  return <div className="space-y-5">
    <header><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#a997ff]">Broadcast</p><h1 className="mt-1 text-2xl font-black">Pengumuman pengguna</h1><p className="mt-1 text-sm text-white/40">Satu pengumuman global, tanpa menyalin data ke setiap akun.</p></header>
    {notice && <div className="rounded-xl border border-[#7c5cfc]/25 bg-[#7c5cfc]/10 px-4 py-3 text-sm text-white/75">{notice}</div>}
    <form onSubmit={submit} className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2"><FiBell className="text-[#a997ff]"/><h2 className="font-black">Buat pengumuman</h2></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-white/55">Judul</span><input required maxLength={120} value={title} onChange={(e)=>setTitle(e.target.value)} className="rk-input w-full rounded-xl px-4 py-3" placeholder="Contoh: Maintenance selesai"/></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-white/55">Isi</span><textarea required maxLength={500} rows={4} value={message} onChange={(e)=>setMessage(e.target.value)} className="rk-input w-full resize-y rounded-xl px-4 py-3" placeholder="Informasi yang akan diterima pengguna"/><span className="mt-1 block text-right text-[10px] text-white/25">{message.length}/500</span></label>
        <label><span className="mb-1.5 block text-xs font-bold text-white/55">Target</span><select value={audience} onChange={(e)=>setAudience(e.target.value as typeof audience)} className="rk-input w-full rounded-xl px-4 py-3"><option value="all">Semua pengguna</option><option value="free">Pengguna gratis</option><option value="premium">Pengguna premium</option></select></label>
        <label><span className="mb-1.5 block text-xs font-bold text-white/55">Kedaluwarsa (opsional)</span><input type="datetime-local" value={expiresAt} onChange={(e)=>setExpiresAt(e.target.value)} className="rk-input w-full rounded-xl px-4 py-3"/></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-white/55">Link internal (opsional)</span><input maxLength={500} value={link} onChange={(e)=>setLink(e.target.value)} pattern="/.*" className="rk-input w-full rounded-xl px-4 py-3" placeholder="/premium atau /komik/project/judul"/></label>
      </div>
      <button disabled={sending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7c5cfc] px-4 py-3 text-sm font-black transition hover:bg-[#8c70ff] disabled:opacity-50 sm:w-auto"><FiSend/>{sending ? "Mengirim..." : "Kirim pengumuman"}</button>
    </form>
    <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-black">Riwayat pengumuman</h2><button onClick={()=>void load()} className="text-xs font-bold text-[#a997ff]">Muat ulang</button></div>
      {loading && <div className="grid place-items-center py-12 text-white/35"><FiLoader className="animate-spin"/></div>}
      {!loading && !items.length && <div className="rounded-2xl border border-white/[.08] py-12 text-center text-sm text-white/35">Belum ada pengumuman.</div>}
      {!loading && items.map((item)=><article key={item.id} className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
        <div className="flex items-start gap-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.is_active ? "bg-emerald-400" : "bg-white/20"}`}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{item.title}</h3><span className="rounded-full bg-white/[.06] px-2 py-0.5 text-[9px] font-bold uppercase text-white/45">{item.audience}</span>{item.expires_at && new Date(item.expires_at)<=new Date() && <span className="text-[9px] font-bold uppercase text-amber-300">kedaluwarsa</span>}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/60">{item.message}</p>{item.link && <p className="mt-2 truncate text-xs text-cyan-200/60">{item.link}</p>}<div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-white/30"><span>{new Date(item.published_at).toLocaleString("id-ID")}</span><span className="flex items-center gap-1"><FiEye/>{item.read_count} membaca</span>{item.is_active ? <span className="flex items-center gap-1 text-emerald-300/70"><FiCheckCircle/>aktif</span> : <span>nonaktif</span>}</div></div></div>
        <div className="mt-4 flex gap-2 border-t border-white/[.06] pt-3"><button disabled={busyId===item.id} onClick={()=>void toggle(item)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/55 hover:text-white">{item.is_active?<FiPauseCircle/>:<FiPlayCircle/>}{item.is_active?"Nonaktifkan":"Aktifkan"}</button><button disabled={busyId===item.id} onClick={()=>void remove(item)} className="ml-auto grid h-9 w-9 place-items-center rounded-lg border border-red-400/15 text-red-300/55 hover:bg-red-400/10 hover:text-red-300" aria-label="Hapus"><FiTrash2/></button></div>
      </article>)}
    </section>
  </div>;
}
