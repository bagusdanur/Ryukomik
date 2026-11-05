"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FiAlertTriangle, FiBookOpen, FiCheckCircle, FiClock, FiMessageCircle, FiRefreshCw,
  FiShield, FiSlash, FiUserX, FiUsers, FiXCircle,
} from "react-icons/fi";

type Application = {
  id: string; user_id: string; handle: string; team_name: string;
  description: string | null; samples: string[]; status: string; review_note: string | null;
  created_at: string; username: string | null;
  contact_wa: string | null; contact_telegram: string | null; contact_discord: string | null;
};

type Scanlator = {
  user_id: string; handle: string; team_name: string; bio: string | null;
  status: string; warnings: number; suspended_until: string | null; moderation_note: string | null;
  contact_wa: string | null; contact_telegram: string | null; contact_discord: string | null;
  created_at: string; username: string | null;
};

type ModerationRow = {
  id: string; user_id: string; action: string; reason: string | null; note: string | null;
  created_at: string; team_name: string | null;
};

type WorkReview = {
  id: string; slug: string; title: string; cover_url: string | null; type: string | null;
  is_adult: boolean; scanlator_handle: string | null; scanlator_team: string | null;
};

type TabId = "pengajuan" | "karya" | "scanlator" | "moderasi";

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: "pengajuan", label: "Pengajuan", icon: <FiUsers size={13} /> },
  { id: "karya", label: "Review Karya", icon: <FiBookOpen size={13} /> },
  { id: "scanlator", label: "Scanlator", icon: <FiShield size={13} /> },
  { id: "moderasi", label: "Moderasi", icon: <FiAlertTriangle size={13} /> },
];

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

/** Manajemen Scanlator — pengajuan, review karya, moderasi (SP/suspend/cabut). */
export default function ScanlatorTab({ getAdminToken }: { getAdminToken: () => Promise<string> }) {
  const [tab, setTab] = useState<TabId>("pengajuan");
  const [apps, setApps] = useState<Application[]>([]);
  const [scanlators, setScanlators] = useState<Scanlator[]>([]);
  const [moderation, setModeration] = useState<ModerationRow[]>([]);
  const [works, setWorks] = useState<WorkReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAdminToken();
      const [aRes, wRes] = await Promise.all([
        fetch("/api/admin/scanlator", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/admin/scanlator/review", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
      ]);
      if (aRes.ok) {
        const json = (await aRes.json()) as { applications?: Application[]; scanlators?: Scanlator[]; moderation?: ModerationRow[] };
        setApps(json.applications || []);
        setScanlators(json.scanlators || []);
        setModeration(json.moderation || []);
      }
      if (wRes.ok) {
        const json = (await wRes.json()) as { works?: WorkReview[] };
        setWorks(json.works || []);
      }
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [getAdminToken]);

  useEffect(() => { void load(); }, [load]);

  const call = async (payload: Record<string, unknown>, okMessage: string) => {
    setBusy(String(payload.id || payload.user_id || "x"));
    setNotice("");
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/scanlator", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setNotice(json?.error || "Gagal memproses."); return; }
      setNotice(okMessage);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const reviewWork = async (work: WorkReview, action: "approve" | "reject") => {
    setBusy(work.id);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/scanlator/review", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: work.id, action }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setNotice(json?.error || "Gagal memproses karya."); return; }
      setNotice(action === "approve" ? `“${work.title}” terbit.` : `“${work.title}” ditolak.`);
      await load();
    } finally { setBusy(null); }
  };

  const pending = apps.filter((a) => a.status === "pending");
  const done = apps.filter((a) => a.status !== "pending");
  const active = scanlators.filter((s) => s.status === "active");
  const suspendedList = scanlators.filter((s) => s.status === "suspended");
  const revoked = scanlators.filter((s) => s.status === "revoked");

  return (
    <div className="space-y-4">
      <div className="rk-card-soft rounded-3xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-bold text-white">Manajemen Scanlator <span className="rk-chip ml-1 rounded-full px-2 py-0.5 text-[10px]">BETA</span></p>
            <p className="mt-0.5 text-[11px] text-white/40">
              {pending.length} pengajuan · {works.length} karya · {active.length} aktif · {suspendedList.length} suspend
            </p>
          </div>
          <button type="button" onClick={() => void load()} aria-label="Muat ulang" className="rounded-lg border border-white/10 p-2 text-white/40 transition hover:text-white">
            <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        {notice && <p className="mt-3 rounded-xl bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/75">{notice}</p>}

        <nav className="mt-3 flex gap-1.5 overflow-x-auto rounded-xl border border-white/[.06] bg-white/[.03] p-1 [scrollbar-width:none]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[11px] font-bold transition ${
                tab === t.id ? "bg-[var(--accent)] text-white" : "text-white/45 hover:text-white/80"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* PENGAJUAN */}
      {tab === "pengajuan" && (
        <>
          {pending.map((app) => (
            <div key={app.id} className="rk-card-soft rounded-3xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{app.team_name} <span className="font-semibold text-white/40">@{app.handle}</span></p>
                  <p className="mt-0.5 text-[11px] text-white/40">User: {app.username || app.user_id.slice(0, 8)} · {timeAgo(app.created_at)}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300"><FiClock size={10} /> Pending</span>
              </div>

              <ContactRow wa={app.contact_wa} tg={app.contact_telegram} dc={app.contact_discord} />

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
                <button type="button" disabled={busy === app.id} onClick={() => void call({ id: app.id, action: "approve", note: notes[app.id] || "" }, `${app.team_name} disetujui — role Scanlator aktif.`)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/90 py-2.5 text-xs font-black text-white disabled:opacity-50">
                  <FiCheckCircle size={13} /> ACC
                </button>
                <button type="button" disabled={busy === app.id} onClick={() => void call({ id: app.id, action: "reject", note: notes[app.id] || "" }, `${app.team_name} ditolak.`)} className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/30 px-4 py-2.5 text-xs font-bold text-rose-300 disabled:opacity-50">
                  <FiXCircle size={13} /> Tolak
                </button>
              </div>
            </div>
          ))}

          {done.length > 0 && (
            <div className="rk-card-soft rounded-3xl p-4">
              <p className="text-[13px] font-bold text-white">Riwayat pengajuan</p>
              <div className="mt-2 divide-y divide-white/[.04]">
                {done.map((app) => (
                  <div key={app.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white/80">{app.team_name} <span className="text-white/40">@{app.handle}</span></p>
                      {app.review_note && <p className="truncate text-[11px] text-white/40">{app.review_note}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${app.status === "approved" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                      {app.status === "approved" ? "ACC" : "Ditolak"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && apps.length === 0 && <p className="py-10 text-center text-sm text-white/40">Belum ada pengajuan.</p>}
        </>
      )}

      {/* REVIEW KARYA */}
      {tab === "karya" && (
        <div className="rk-card-soft rounded-3xl p-4">
          <p className="text-[13px] font-bold text-white">Review karya ({works.length} menunggu)</p>
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
                  <button type="button" disabled={busy === work.id} onClick={() => void reviewWork(work, "approve")} className="flex items-center gap-1 rounded-lg bg-emerald-500/90 px-3 py-2 text-[11px] font-black text-white disabled:opacity-50">
                    <FiCheckCircle size={12} /> Terbitkan
                  </button>
                  <button type="button" disabled={busy === work.id} onClick={() => void reviewWork(work, "reject")} className="flex items-center gap-1 rounded-lg border border-rose-400/30 px-3 py-2 text-[11px] font-bold text-rose-300 disabled:opacity-50">
                    <FiXCircle size={12} /> Tolak
                  </button>
                </div>
              </div>
            ))}
            {works.length === 0 && <p className="py-8 text-center text-xs text-white/40">Tidak ada karya menunggu review.</p>}
          </div>
        </div>
      )}

      {/* SCANLATOR AKTIF */}
      {tab === "scanlator" && (
        <>
          {[...active, ...suspendedList, ...revoked].map((s) => (
            <div key={s.user_id} className="rk-card-soft rounded-3xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{s.team_name} <span className="font-semibold text-white/40">@{s.handle}</span></p>
                  <p className="mt-0.5 text-[11px] text-white/40">
                    {s.username || s.user_id.slice(0, 8)} · gabung {timeAgo(s.created_at)}
                    {s.warnings > 0 ? ` · ${s.warnings} SP` : ""}
                  </p>
                </div>
                <StatusPill status={s.status} />
              </div>

              <ContactRow wa={s.contact_wa} tg={s.contact_telegram} dc={s.contact_discord} />

              {s.suspended_until && s.status === "suspended" && (
                <p className="mt-2 text-[11px] font-semibold text-amber-200">Suspend sampai {new Date(s.suspended_until).toLocaleDateString("id-ID")}</p>
              )}
              {s.moderation_note && <p className="mt-1 text-[11px] text-white/40">Catatan: {s.moderation_note}</p>}

              <input
                value={notes[s.user_id] || ""}
                onChange={(e) => setNotes((n) => ({ ...n, [s.user_id]: e.target.value }))}
                placeholder="Alasan / catatan moderasi…"
                className="rk-input mt-3 w-full rounded-xl px-3 py-2 text-xs"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busy === s.user_id} onClick={() => void call({ user_id: s.user_id, action: "warn", reason: notes[s.user_id] || "Pelanggaran aturan", note: notes[s.user_id] || "" }, `SP diberikan ke ${s.team_name}.`)} className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-2 text-[11px] font-bold text-amber-200 disabled:opacity-50">
                  <FiAlertTriangle size={12} /> Beri SP
                </button>
                <button type="button" disabled={busy === s.user_id} onClick={() => void call({ user_id: s.user_id, action: "suspend", days: 7, reason: notes[s.user_id] || "Pelanggaran aturan", note: notes[s.user_id] || "" }, `${s.team_name} disuspend 7 hari.`)} className="flex items-center gap-1.5 rounded-xl bg-orange-500/15 px-3 py-2 text-[11px] font-bold text-orange-200 disabled:opacity-50">
                  <FiSlash size={12} /> Suspend 7 hari
                </button>
                {s.status !== "revoked" ? (
                  <button type="button" disabled={busy === s.user_id} onClick={() => void call({ user_id: s.user_id, action: "revoke", reason: notes[s.user_id] || "Pelanggaran berat", note: notes[s.user_id] || "" }, `Akses ${s.team_name} dicabut.`)} className="flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-[11px] font-bold text-rose-200 disabled:opacity-50">
                    <FiUserX size={12} /> Cabut akses
                  </button>
                ) : (
                  <button type="button" disabled={busy === s.user_id} onClick={() => void call({ user_id: s.user_id, action: "restore", note: notes[s.user_id] || "" }, `Akses ${s.team_name} dipulihkan.`)} className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-[11px] font-bold text-emerald-200 disabled:opacity-50">
                    <FiCheckCircle size={12} /> Pulihkan
                  </button>
                )}
              </div>
            </div>
          ))}
          {!loading && scanlators.length === 0 && <p className="py-10 text-center text-sm text-white/40">Belum ada Scanlator.</p>}
        </>
      )}

      {/* MODERASI */}
      {tab === "moderasi" && (
        <div className="rk-card-soft rounded-3xl p-4">
          <p className="text-[13px] font-bold text-white">Riwayat moderasi</p>
          <div className="mt-2 divide-y divide-white/[.04]">
            {moderation.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/80">{m.team_name || m.user_id.slice(0, 8)} · {labelAction(m.action)}</p>
                  {(m.reason || m.note) && <p className="text-[11px] text-white/40">{m.note || m.reason}</p>}
                </div>
                <span className="shrink-0 text-[10px] text-white/35">{timeAgo(m.created_at)}</span>
              </div>
            ))}
            {moderation.length === 0 && <p className="py-8 text-center text-xs text-white/40">Belum ada tindakan moderasi.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function labelAction(action: string) {
  return { warn: "SP", suspend: "Suspend", revoke: "Cabut akses", restore: "Pulihkan" }[action] || action;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Aktif", cls: "bg-emerald-500/10 text-emerald-300" },
    suspended: { label: "Suspend", cls: "bg-amber-500/10 text-amber-300" },
    revoked: { label: "Dicabut", cls: "bg-rose-500/10 text-rose-300" },
  };
  const s = map[status] || map.active;
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${s.cls}`}>{s.label}</span>;
}

function ContactRow({ wa, tg, dc }: { wa: string | null; tg: string | null; dc: string | null }) {
  if (!wa && !tg && !dc) {
    return <p className="mt-2 text-[11px] text-amber-200/70">Kontak belum diisi</p>;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {wa && (
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
          <FiMessageCircle size={10} /> WA
        </a>
      )}
      {tg && (
        <a href={`https://t.me/${tg}`} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 rounded-lg bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold text-sky-200">
          <FiMessageCircle size={10} /> Telegram
        </a>
      )}
      {dc && (
        <a href={`https://discord.com/users/${dc}`} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-200">
          <FiMessageCircle size={10} /> Discord
        </a>
      )}
    </div>
  );
}
