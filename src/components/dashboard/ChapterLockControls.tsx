"use client";
import { useEffect, useState } from 'react';

export type LockableChapter = { id: string; chapter_number: number | string; is_published: boolean; premium_lock_until?: string | null };
const dateWib = (value: string | number) => new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
function useLockClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  return now;
}

export function ChapterLockBadge({ chapter }: { chapter: LockableChapter }) {
  const now = useLockClock();
  const active = chapter.premium_lock_until && Date.parse(chapter.premium_lock_until) > now;
  return <div className="mt-1 text-[10px] text-white/50"><span className={active ? 'font-bold text-amber-300' : 'text-emerald-300'}>{active ? 'Premium' : chapter.premium_lock_until ? 'Lock berakhir' : 'Gratis'}</span>{chapter.premium_lock_until && <span> · Dibuka {dateWib(chapter.premium_lock_until)}</span>}</div>;
}

export default function ChapterLockControls({ chapters, getAdminToken, onChanged }: { chapters: LockableChapter[]; getAdminToken: () => Promise<string>; onChanged: () => void | Promise<void> }) {
  const now = useLockClock();
  const [action, setAction] = useState<'lock' | 'unlock' | null>(null);
  const [days, setDays] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(Date.now());
  const active = chapters.some(chapter => chapter.premium_lock_until && Date.parse(chapter.premium_lock_until) > now);
  const canLock = chapters.length > 0 && chapters.length <= 100 && chapters.every(chapter => chapter.is_published);
  const open = (value: 'lock' | 'unlock') => { setAction(value); setDays(3); setStarted(Date.now()); setError(''); };
  async function save() {
    setSaving(true); setError('');
    try {
      const token = await getAdminToken();
      const response = await fetch('/api/admin/project/chapter-lock', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ chapter_ids: chapters.map(chapter => chapter.id), action, ...(action === 'lock' ? { duration_days: days } : {}) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Gagal mengubah lock');
      setAction(null); await onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal mengubah lock'); }
    finally { setSaving(false); }
  }
  return <>
    <button type="button" disabled={!canLock} title={!canLock ? 'Pilih chapter yang sudah dipublikasikan (maksimal 100)' : undefined} onClick={() => open('lock')} className="rounded-lg bg-amber-400/10 px-2.5 py-2 text-[10px] font-bold text-amber-300 disabled:opacity-30">{active ? 'Ubah Durasi' : 'Lock Premium'}</button>
    {chapters.some(chapter => chapter.premium_lock_until) && <button type="button" onClick={() => open('unlock')} className="rounded-lg bg-emerald-400/10 px-2.5 py-2 text-[10px] font-bold text-emerald-300">Buka Lock</button>}
    {action && <div role="dialog" aria-modal="true" aria-label={action === 'lock' ? 'Lock Premium' : 'Buka Lock'} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4" onClick={() => { if (!saving) setAction(null); }}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#13131a] p-6 text-white" onClick={event => event.stopPropagation()}>
        <h3 className="text-lg font-bold">{action === 'unlock' ? 'Buka Lock' : active ? 'Ubah Durasi Lock Premium' : 'Lock Premium'}</h3>
        <p className="mt-3 max-h-32 overflow-auto text-sm text-white/60">{chapters.map(chapter => `Chapter ${chapter.chapter_number}`).join(', ')}</p>
        {action === 'lock' ? <>
          <label className="mt-4 block text-sm">Durasi (hari)<input type="number" min={1} max={365} step={1} value={days} onChange={event => setDays(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 p-3" /></label>
          <p className="mt-3 text-xs text-white/60">Perkiraan dibuka: {Number.isInteger(days) && days >= 1 && days <= 365 ? dateWib(started + days * 86400000) : 'Pilih 1–365 hari'}. Waktu pasti dihitung server saat disimpan.</p>
          <p className="mt-3 text-xs text-amber-200">Selama lock, hanya premium aktif yang dapat membaca. {active ? 'Countdown semua chapter terpilih dimulai ulang sejak perubahan disimpan.' : 'Chapter otomatis gratis setelah durasi habis.'}</p>
        </> : <p className="mt-4 text-sm text-white/60">Chapter terpilih akan langsung bisa dibaca semua pengunjung.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setAction(null)} className="rounded-lg bg-white/10 px-4 py-2 text-sm">Batal</button><button type="button" disabled={saving || (action === 'lock' && (!canLock || !Number.isInteger(days) || days < 1 || days > 365))} onClick={() => void save()} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-40">{saving ? 'Menyimpan...' : 'Konfirmasi'}</button></div>
      </div>
    </div>}
  </>;
}
