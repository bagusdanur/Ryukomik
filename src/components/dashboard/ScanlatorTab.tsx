"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiRefreshCw, FiXCircle } from "react-icons/fi";

type WorkReview = {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  type: string | null;
  is_adult: boolean;
  scanlator_handle: string | null;
  scanlator_team: string | null;
};

type Application = {
  id: string;
  user_id: string;
  handle: string;
  team_name: string;
  description: string | null;
  samples: string[];
  status: string;
  review_note: string | null;
  created_at: string;
  username: string | null;
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

/** Antrean pengajuan Akun Translation (Scanlator) — Fase A BETA. */
export default function ScanlatorTab({ getAdminToken }: { getAdminToken: () => Promise<string> }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [works, setWorks] = useState<WorkReview[]>([]);
  const [busyWork, setBusyWork] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/scanlator", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { applications?: Application[] };
        setApps(json.applications || []);
      }
      const wRes = await fetch("/api/admin/scanlator/review", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null);
      if (wRes?.ok) {
        const wJson = (await wRes.json()) as { works?: WorkReview[] };
        setWorks(wJson.works || []);
      }
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [getAdminToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (app: Application, action: "approve" | "reject") => {
    setBusyId(app.id);
    setNotice("");
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/scanlator", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: app.id, action, note: notes[app.id] || "" }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) {
        setNotice(json?.error || "Gagal memproses.");
        return;
      }
      setNotice(action === "approve" ? `${app.team_name} disetujui — role Scanlator aktif.` : `${app.team_name} ditolak.`);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const reviewWork = async (work: WorkReview, action: "approve" | "reject") => {
    setBusyWork(work.id);
    setNotice("");
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/scanlator/review", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: work.id, action }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) {
        setNotice(json?.error || "Gagal memproses karya.");
        return;
      }
      setNotice(action === "approve" ? `“${work.title}” terbit.` : `“${work.title}” ditolak.`);
      await load();
    } finally {
      setBusyWork(null);
    }
  };

  const pending = apps.filter((a) => a.status === "pending");
  const done = apps.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-4">
      <div className="rk-card-soft rounded-3xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-bold text-white">Pengajuan Akun Translation <span className="rk-chip ml-1 rounded-full px-2 py-0.5 text-[10px]">BETA</span></p>
            <p className="mt-0.5 text-[11px] text-white/40">
              {pending.length} menunggu review · {done.length} sudah diproses. Setujui = role Scanlator aktif + profil dibuat.
            </p>
          </div>
          <button type="button" onClick={() => void load()} aria-label="Muat ulang antrean" className="rounded-lg border border-white/10 p-2 text-white/40 transition hover:text-white">
            <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        {notice && <p className="mt-3 rounded-xl bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/75">{notice}</p>}
      </div>

      {pending.map((app) => (
        <div key={app.id} className="rk-card-soft rounded-3xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{app.team_name} <span className="font-semibold text-white/40">@{app.handle}</span></p>
              <p className="mt-0.5 text-[11px] text-white/40">User: {app.username || app.user_id.slice(0, 8)} · {timeAgo(app.created_at)}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300">
              <FiClock size={11} /> Pending
            </span>
          </div>

          {app.description && <p className="mt-3 text-xs leading-relaxed text-white/60">{app.description}</p>}

          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Contoh hasil TL</p>
            {app.samples.map((s, i) => (
              <p key={i} className="break-all rounded-lg bg-white/[.03] px-2.5 py-1.5 text-[11px] text-white/65">{s}</p>
            ))}
          </div>

          <input
            value={notes[app.id] || ""}
            onChange={(e) => setNotes((n) => ({ ...n, [app.id]: e.target.value }))}
            placeholder="Catatan untuk pemohon (opsional)…"
            className="rk-input mt-3 w-full rounded-xl px-3 py-2 text-xs"
          />
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busyId === app.id} onClick={() => void review(app, "approve")} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/90 py-2.5 text-xs font-black text-white disabled:opacity-50">
              <FiCheckCircle size={13} /> ACC — Jadikan Scanlator
            </button>
            <button type="button" disabled={busyId === app.id} onClick={() => void review(app, "reject")} className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/30 px-4 py-2.5 text-xs font-bold text-rose-300 disabled:opacity-50">
              <FiXCircle size={13} /> Tolak
            </button>
          </div>
        </div>
      ))}

      {works.length > 0 && (
        <div className="rk-card-soft rounded-3xl p-4">
          <p className="text-[13px] font-bold text-white">Review Karya Scanlator ({works.length} menunggu)</p>
          <p className="mt-0.5 text-[11px] text-white/40">ACC = seri + chapter-nya terbit. Tolak = tidak tampil di situs.</p>
          <div className="mt-3 space-y-3">
            {works.map((work) => (
              <div key={work.id} className="flex items-center gap-3 rounded-2xl bg-white/[.03] p-3">
                {work.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={work.cover_url} alt="" className="h-16 w-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[.06]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-white">{work.title}</p>
                  <p className="text-[11px] text-white/40">{work.scanlator_team || work.scanlator_handle} · {work.type || "—"}{work.is_adult ? " · 18+" : ""}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" disabled={busyWork === work.id} onClick={() => void reviewWork(work, "approve")} className="flex items-center gap-1 rounded-lg bg-emerald-500/90 px-3 py-2 text-[11px] font-black text-white disabled:opacity-50">
                    <FiCheckCircle size={12} /> Terbitkan
                  </button>
                  <button type="button" disabled={busyWork === work.id} onClick={() => void reviewWork(work, "reject")} className="flex items-center gap-1 rounded-lg border border-rose-400/30 px-3 py-2 text-[11px] font-bold text-rose-300 disabled:opacity-50">
                    <FiXCircle size={12} /> Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div className="rk-card-soft rounded-3xl p-4">
          <p className="text-[13px] font-bold text-white">Riwayat</p>
          <div className="mt-2 divide-y divide-white/[.04]">
            {done.map((app) => (
              <div key={app.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white/80">{app.team_name} <span className="text-white/40">@{app.handle}</span></p>
                  {app.review_note && <p className="truncate text-[11px] text-white/40">{app.review_note}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${app.status === "approved" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                  {app.status === "approved" ? "Scanlator" : "Ditolak"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && apps.length === 0 && <p className="py-10 text-center text-sm text-white/40">Belum ada pengajuan.</p>}
    </div>
  );
}
