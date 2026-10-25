"use client";

import { useCallback, useEffect, useState } from "react";
import { FiAward, FiCheck, FiRefreshCw, FiSave, FiX } from "react-icons/fi";
import { RiTrophyFill } from "react-icons/ri";

type MarathonEvent = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  prize_1: string | null;
  prize_2: string | null;
  prize_3: string | null;
  premium_days_1: number;
  premium_days_2: number;
  premium_days_3: number;
  weekly_days: number[] | null;
  monthly_days: number[] | null;
  daily_chapter_cap: number;
};

type Winner = {
  id: string;
  period_type: "weekly" | "monthly";
  period_key: string;
  rank: number;
  user_id: string;
  username: string | null;
  chapters: number;
  prize_label: string | null;
  premium_days: number;
  status: "pending" | "granted" | "void";
  created_at: string;
};

type Props = {
  getAdminToken: () => Promise<string>;
};

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_STYLE: Record<Winner["status"], string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  granted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  void: "bg-white/10 text-white/40 border-white/15",
};

export default function MarathonTab({ getAdminToken }: Props) {
  const [event, setEvent] = useState<MarathonEvent | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    is_active: true,
    prize_1: "",
    prize_2: "",
    prize_3: "",
    premium_days_1: 30,
    premium_days_2: 14,
    premium_days_3: 7,
    weekly_days: [7, 3, 1],
    monthly_days: [30, 14, 7],
    daily_chapter_cap: 300,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAdminToken();
      if (!token) return;
      const res = await fetch("/api/admin/marathon", {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal memuat event.");
      const ev = (json?.event ?? null) as MarathonEvent | null;
      setEvent(ev);
      setWinners((json?.winners ?? []) as Winner[]);
      if (ev) {
        setForm({
          title: ev.title,
          description: ev.description || "",
          starts_at: toLocalInput(ev.starts_at),
          ends_at: toLocalInput(ev.ends_at),
          is_active: ev.is_active,
          prize_1: ev.prize_1 || "",
          prize_2: ev.prize_2 || "",
          prize_3: ev.prize_3 || "",
          premium_days_1: ev.premium_days_1,
          premium_days_2: ev.premium_days_2,
          premium_days_3: ev.premium_days_3,
          weekly_days:
            ev.weekly_days && ev.weekly_days.length
              ? [...ev.weekly_days, 0, 0, 0].slice(0, 3)
              : [7, 3, 1],
          monthly_days:
            ev.monthly_days && ev.monthly_days.length
              ? [...ev.monthly_days, 0, 0, 0].slice(0, 3)
              : [30, 14, 7],
          daily_chapter_cap: ev.daily_chapter_cap,
        });
      }
    } catch (cause) {
      const timedOut =
        cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError");
      setError(timedOut ? "Server timeout. Coba lagi." : cause instanceof Error ? cause.message : "Gagal memuat.");
    } finally {
      setLoading(false);
    }
  }, [getAdminToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig() {
    setBusy("save");
    setNotice(null);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/marathon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventId: event?.id,
          title: form.title,
          description: form.description,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          is_active: form.is_active,
          prize_1: form.prize_1,
          prize_2: form.prize_2,
          prize_3: form.prize_3,
          premium_days_1: form.premium_days_1,
          premium_days_2: form.premium_days_2,
          premium_days_3: form.premium_days_3,
          weekly_days: form.weekly_days,
          monthly_days: form.monthly_days,
          daily_chapter_cap: form.daily_chapter_cap,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal menyimpan.");
      setNotice("Konfigurasi tersimpan.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyimpan.");
    } finally {
      setBusy(null);
    }
  }

  async function winnerAction(winnerId: string, action: "grant" | "void") {
    if (action === "grant" && !confirm("Berikan hadiah premium ke pemenang ini?")) return;
    setBusy(`${action}:${winnerId}`);
    setNotice(null);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/marathon", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, winnerId }),
        signal: AbortSignal.timeout(20_000),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal memproses.");
      setNotice(action === "grant" ? "Hadiah diberikan." : "Pemenang dibatalkan.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memproses.");
    } finally {
      setBusy(null);
    }
  }

  async function runFinalize() {
    if (!confirm("Bekukan pemenang periode yang sudah selesai sekarang?")) return;
    setBusy("finalize");
    setNotice(null);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/marathon", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "finalize" }),
        signal: AbortSignal.timeout(30_000),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal finalisasi.");
      const weekly = json?.weekly?.winners?.length ?? 0;
      const monthly = json?.monthly?.winners?.length ?? 0;
      setNotice(`Finalisasi selesai: ${weekly} winner mingguan, ${monthly} winner bulanan.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal finalisasi.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#7c5cfc] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[15px] font-bold text-white">
            <RiTrophyFill className="mr-1.5 inline text-amber-300" /> Marathon Baca
          </p>
          <p className="text-[11px] text-white/30">
            Leaderboard mingguan & bulanan — data di database lokal.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="w-8 h-8 rounded-lg bg-white/[.05] border border-white/[.08] flex items-center justify-center text-white/40 hover:text-white"
          title="Muat ulang"
        >
          <FiRefreshCw size={13} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300">
          {notice}
        </div>
      )}

      {!event ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-[12px] text-white/40">
          Belum ada event aktif. Jalankan seed <code className="text-cyan-300">006_marathon_event.sql</code>.
        </div>
      ) : (
        <>
          {/* Config */}
          <div className="rounded-2xl border border-white/[.07] bg-[#13131a] p-3 space-y-2.5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/30">Judul</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-[12px] text-white outline-none focus:border-[#7c5cfc]/50"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/30">Cap chapter/hari</span>
                <input
                  type="number"
                  min={1}
                  value={form.daily_chapter_cap}
                  onChange={(e) => setForm((f) => ({ ...f, daily_chapter_cap: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-[12px] text-white outline-none focus:border-[#7c5cfc]/50"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/30">Deskripsi</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full resize-none rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-[12px] text-white outline-none focus:border-[#7c5cfc]/50"
              />
            </label>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/30">Mulai</span>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                  className="w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-[12px] text-white outline-none focus:border-[#7c5cfc]/50"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/30">Selesai (kosong = rolling)</span>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                  className="w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-[12px] text-white outline-none focus:border-[#7c5cfc]/50"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([
                { key: "weekly_days" as const, label: "Hadiah mingguan", tone: "text-cyan-300" },
                { key: "monthly_days" as const, label: "Hadiah bulanan", tone: "text-violet-300" },
              ]).map((group) => (
                <div key={group.key} className="rounded-xl border border-white/[.06] bg-black/20 p-2">
                  <p className={`mb-1.5 text-[10px] font-bold uppercase tracking-widest ${group.tone}`}>
                    {group.label} <span className="text-white/25">(hari premium)</span>
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[0, 1, 2].map((index) => (
                      <label key={index} className="block">
                        <span className="mb-0.5 block text-[9px] font-bold text-white/35">
                          Juara {index + 1}
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={form[group.key][index] ?? 0}
                          onChange={(e) => {
                            const value = Math.max(0, Math.floor(Number(e.target.value) || 0));
                            setForm((f) => {
                              const next = [...f[group.key]];
                              next[index] = value;
                              return { ...f, [group.key]: next };
                            });
                          }}
                          className="w-full rounded-lg border border-white/[.08] bg-black/30 px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#7c5cfc]/50"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="flex items-center gap-2 text-[11px] font-semibold text-white/60">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-3.5 w-3.5 accent-[#7c5cfc]"
                />
                Event aktif
              </label>
              <button
                onClick={() => void saveConfig()}
                disabled={busy === "save"}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-[#7c5cfc] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
              >
                <FiSave size={12} /> {busy === "save" ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={() => void runFinalize()}
                disabled={busy === "finalize"}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[.05] px-3 py-2 text-[11px] font-bold text-white/80 disabled:opacity-50"
              >
                <FiAward size={12} /> {busy === "finalize" ? "Memproses..." : "Finalisasi sekarang"}
              </button>
            </div>
          </div>

          {/* Winners */}
          <div className="rounded-2xl border border-white/[.07] bg-[#13131a] p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/30">
              Pemenang ({winners.length})
            </p>
            {winners.length === 0 ? (
              <p className="py-3 text-[11px] text-white/30">
                Belum ada pemenang. Cron berjalan 00:10 WIB setiap hari untuk periode yang selesai.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {winners.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center gap-2 rounded-xl border border-white/[.05] bg-black/20 px-2.5 py-2"
                  >
                    <span className="w-6 shrink-0 text-center text-[11px] font-black text-white/40">#{w.rank}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-white/85">
                        {w.username || w.user_id.slice(0, 8)}
                      </p>
                      <p className="truncate text-[9px] text-white/30">
                        {w.period_type} {w.period_key} · {w.chapters} ch · +{w.premium_days}d
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${STATUS_STYLE[w.status]}`}>
                      {w.status}
                    </span>
                    {w.status !== "granted" && (
                      <button
                        onClick={() => void winnerAction(w.id, "grant")}
                        disabled={busy === `grant:${w.id}`}
                        className="shrink-0 rounded-lg bg-emerald-500/15 p-1.5 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                        title="Berikan hadiah"
                      >
                        <FiCheck size={11} />
                      </button>
                    )}
                    {w.status === "pending" && (
                      <button
                        onClick={() => void winnerAction(w.id, "void")}
                        disabled={busy === `void:${w.id}`}
                        className="shrink-0 rounded-lg bg-red-500/15 p-1.5 text-red-300 hover:bg-red-500/25 disabled:opacity-50"
                        title="Batalkan"
                      >
                        <FiX size={11} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[9px] leading-relaxed text-white/25">
              Cek username sebelum grant — hadiah premium langsung menambah masa aktif user.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
