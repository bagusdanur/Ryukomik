"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FiAlertTriangle, FiBookOpen, FiCheck, FiClock, FiMessageCircle, FiRefreshCw, FiSlash, FiTrash2, FiUserX, FiX,
} from "react-icons/fi";
import { Button, Panel, PanelHead, Tabs, inputClass } from "@/components/scanlator/ui";

type Application = {
  id: string; user_id: string; handle: string; team_name: string;
  description: string | null; samples: string[]; status: string; review_note: string | null;
  created_at: string; username: string | null;
  contact_wa: string | null; contact_telegram: string | null; contact_discord: string | null;
};

type Scanlator = {
  user_id: string; handle: string; team_name: string; bio: string | null;
  status: string; verified?: boolean; warnings: number; suspended_until: string | null; moderation_note: string | null;
  contact_wa: string | null; contact_telegram: string | null; contact_discord: string | null;
  created_at: string; username: string | null;
};

type ModerationRow = { id: string; user_id: string; action: string; reason: string | null; note: string | null; created_at: string; team_name: string | null };
type ReportRow = {
  id: string; kind: string; target_slug: string | null; target_handle: string | null;
  reason: string; detail: string | null; status: string; admin_note: string | null;
  created_at: string; reporter: string | null;
};
type PendingChapter = { id: string; chapter_number: number; title: string | null; pages: number; is_published: boolean; review_status?: string; pending_pages?: number };

type WorkReview = {
  id: string; slug: string; title: string; cover_url: string | null; type: string | null;
  is_adult: boolean; scanlator_handle: string | null; scanlator_team: string | null;
  chapters?: PendingChapter[];
  pendingChapters?: PendingChapter[];
  revisions?: PendingChapter[];
  review_status?: string | null;
};

type TabId = "pengajuan" | "karya" | "scanlator" | "moderasi" | "laporan";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "pengajuan", label: "Pengajuan" },
  { id: "karya", label: "Project" },
  { id: "scanlator", label: "Scanlator" },
  { id: "moderasi", label: "Moderasi" },
  { id: "laporan", label: "Laporan" },
];

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (d < 60) return "baru";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}j`;
  return `${Math.floor(d / 86400)}h`;
}

export default function ScanlatorTab({ getAdminToken }: { getAdminToken: () => Promise<string> }) {
  const [tab, setTab] = useState<TabId>("pengajuan");
  const [apps, setApps] = useState<Application[]>([]);
  const [scanlators, setScanlators] = useState<Scanlator[]>([]);
  const [moderation, setModeration] = useState<ModerationRow[]>([]);
  const [works, setWorks] = useState<WorkReview[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [openUser, setOpenUser] = useState<string | null>(null);
  type TeamWork = {
    slug: string; title: string; cover_url?: string | null; type?: string | null;
    review_status: string; review_note?: string | null; is_published: boolean;
    view_count: number; chapters_total?: number; chapters_published?: number;
  };
  const [userWorks, setUserWorks] = useState<Record<string, TeamWork[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; team: string } | null>(null);
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
        const j = (await aRes.json()) as { applications?: Application[]; scanlators?: Scanlator[]; moderation?: ModerationRow[] };
        setApps(j.applications || []); setScanlators(j.scanlators || []); setModeration(j.moderation || []);
      }
      if (wRes.ok) setWorks(((await wRes.json()) as { works?: WorkReview[] }).works || []);
      const rRes = await fetch("/api/admin/scanlator/reports", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null);
      if (rRes?.ok) setReports(((await rRes.json()) as { reports?: ReportRow[] }).reports || []);
    } catch { setApps([]); }
    finally { setLoading(false); }
  }, [getAdminToken]);

  useEffect(() => { void load(); }, [load]);

  const call = async (payload: Record<string, unknown>, okMessage: string) => {
    setBusy(String(payload.id || payload.user_id || "x")); setNotice("");
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
    } finally { setBusy(null); }
  };

  const reviewWork = async (
    work: WorkReview,
    action: "approve_series" | "reject_series" | "approve_chapter" | "reject_chapter" | "approve_revision" | "reject_revision",
    chapterId?: string,
  ) => {
    const noteKey = chapterId || work.id;
    const note = (notes[noteKey] || notes[work.id] || "").trim();
    if (action.includes("reject") && !note) {
      setNotice("Isi alasan penolakan dulu — Scanlator perlu tahu yang harus diperbaiki.");
      return;
    }
    setBusy(chapterId || work.id);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/scanlator/review", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: work.id, chapter_id: chapterId, action, note }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setNotice(json?.error || "Gagal."); return; }
      setNotice(
        action === "approve_series"
          ? `Seri “${work.title}” disetujui. Chapter di-ACC satu per satu.`
          : action === "reject_series"
            ? `Seri “${work.title}” ditolak.`
            : action === "approve_chapter"
              ? "Chapter diterbitkan."
              : action === "approve_revision"
                ? "Revisi disetujui — versi baru tayang."
                : action === "reject_revision"
                  ? "Revisi ditolak, versi lama tetap tayang."
                  : "Chapter ditolak.",
      );
      await load();
    } finally { setBusy(null); }
  };

  const toggleUserProjects = async (userId: string) => {
    if (openUser === userId) { setOpenUser(null); return; }
    setOpenUser(userId);
    if (userWorks[userId]) return;
    try {
      const token = await getAdminToken();
      const res = await fetch(`/api/admin/scanlator/projects?user_id=${userId}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as {
          works?: Array<{
            slug: string; title: string; cover_url?: string | null; type?: string | null;
            review_status: string; review_note?: string | null; is_published: boolean;
            view_count: number; chapters_total?: number; chapters_published?: number;
          }>;
        };
        setUserWorks((prev) => ({ ...prev, [userId]: j.works || [] }));
      }
    } catch { /* diamkan */ }
  };

  const resolveReport = async (id: string, action: "resolve" | "dismiss") => {
    setBusy(id);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/scanlator/reports", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, note: notes[id] || "" }),
      });
      if (res.ok) { setNotice("Laporan diproses."); await load(); }
    } finally { setBusy(null); }
  };

  const pending = apps.filter((a) => a.status === "pending");
  const done = apps.filter((a) => a.status !== "pending");
  const active = scanlators.filter((s) => s.status === "active");
  const suspended = scanlators.filter((s) => s.status === "suspended");
  const revoked = scanlators.filter((s) => s.status === "revoked");

  return (
    <div className="space-y-3">
      <Panel>
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <div className="min-w-0">
            <p className="text-[13px] font-bold">Scanlator</p>
            <p className="mt-0.5 text-[11px] text-white/35">
              {pending.length} pengajuan · {works.length} project · {active.length} aktif · {suspended.length} suspend
            </p>
          </div>
          <button type="button" onClick={() => void load()} aria-label="Muat ulang" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[.08] text-white/40 transition-colors hover:text-white">
            <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="mt-2">
          <Tabs tabs={TABS} active={tab} onChange={(id) => setTab(id as TabId)} />
        </div>
        {notice && <p className="border-t border-white/[.05] px-4 py-2 text-[11px] font-semibold text-white/70">{notice}</p>}
      </Panel>

      {tab === "pengajuan" && (
        <>
          {pending.map((app) => (
            <Panel key={app.id}>
              <div className="flex items-start justify-between gap-3 px-4 pt-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold">{app.team_name} <span className="font-normal text-white/35">@{app.handle}</span></p>
                  <p className="mt-0.5 text-[11px] text-white/35">{app.username || app.user_id.slice(0, 8)} · {timeAgo(app.created_at)} lalu</p>
                </div>
                <span className="shrink-0 rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300">Pending</span>
              </div>

              <div className="px-4 pt-2"><Contacts wa={app.contact_wa} tg={app.contact_telegram} dc={app.contact_discord} /></div>

              {app.description && <p className="px-4 pt-2 text-[11px] leading-relaxed text-white/50">{app.description}</p>}

              <div className="space-y-1 px-4 pt-2">
                {app.samples.map((s, i) => (
                  <p key={i} className="break-all rounded-md bg-white/[.03] px-2.5 py-1.5 text-[11px] text-white/55">{s}</p>
                ))}
              </div>

              <div className="p-4 pt-3">
                <input
                  value={notes[app.id] || ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [app.id]: e.target.value }))}
                  placeholder="Catatan untuk pemohon…"
                  className={inputClass}
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button onClick={() => void call({ id: app.id, action: "approve", note: notes[app.id] || "" }, `${app.team_name} disetujui.`)} disabled={busy === app.id} className="w-full">
                    <FiCheck size={13} /> ACC
                  </Button>
                  <Button variant="danger" onClick={() => void call({ id: app.id, action: "reject", note: notes[app.id] || "" }, `${app.team_name} ditolak.`)} disabled={busy === app.id} className="w-full">
                    <FiX size={13} /> Tolak
                  </Button>
                </div>
              </div>
            </Panel>
          ))}

          {done.length > 0 && (
            <Panel>
              <PanelHead title="Riwayat" desc={`${done.length} pengajuan sudah diproses`} />
              <ul className="divide-y divide-white/[.05]">
                {done.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-white/75">{a.team_name} <span className="text-white/30">@{a.handle}</span></p>
                      {a.review_note && <p className="truncate text-[10px] text-white/30">{a.review_note}</p>}
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold ${a.status === "approved" ? "text-emerald-300" : "text-rose-300"}`}>{a.status === "approved" ? "ACC" : "Ditolak"}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {!loading && apps.length === 0 && <p className="py-10 text-center text-[12px] text-white/30">Belum ada pengajuan.</p>}
        </>
      )}

      {tab === "karya" && (
        <Panel>
          <PanelHead title={`Review project (${works.length})`} desc="ACC = project & chapter terbit." />
          {works.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12px] text-white/30">Tidak ada project menunggu.</p>
          ) : (
            <ul className="divide-y divide-white/[.05]">
              {works.map((w) => (
                <li key={w.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {w.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.cover_url} alt="" loading="lazy" className="shrink-0 rounded-[4px] object-cover" style={{ height: 52, width: 36 }} />
                    ) : (
                      <div className="shrink-0 rounded-[4px] bg-white/[.05]" style={{ height: 52, width: 36 }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-white/90">{w.title}</p>
                      <p className="mt-0.5 truncate text-[10px] text-white/30">{w.scanlator_team || w.scanlator_handle} · {w.type || "—"}{w.is_adult ? " · 18+" : ""}</p>
                    </div>
                  </div>
                  <input
                    value={notes[w.id] || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [w.id]: e.target.value }))}
                    placeholder="Alasan (wajib saat menolak)…"
                    className={`${inputClass} mt-2`}
                  />
                  {w.review_status === "pending" ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button onClick={() => void reviewWork(w, "approve_series")} disabled={busy === w.id}><FiCheck size={12} /> ACC seri</Button>
                      <Button variant="danger" onClick={() => void reviewWork(w, "reject_series")} disabled={busy === w.id}><FiX size={12} /> Tolak seri</Button>
                    </div>
                  ) : (
                    <p className="mt-2 rounded-md border border-emerald-400/20 bg-emerald-400/[.06] px-2.5 py-1.5 text-[10px] font-semibold text-emerald-300/85">
                      Seri sudah terbit — tinggal ACC chapter baru di bawah.
                    </p>
                  )}

                  {(w.revisions?.length ?? 0) > 0 && (
                    <div className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/[.05]">
                      <p className="border-b border-amber-300/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-200/80">
                        Revisi menunggu ({w.revisions?.length})
                      </p>
                      <ul className="divide-y divide-amber-300/10">
                        {(w.revisions || []).map((c) => (
                          <li key={`rev-${c.id}`} className="px-2.5 py-2">
                            <p className="text-[11px] text-white/75">
                              Ch. {c.chapter_number} · {c.pages} gambar lama → <strong className="font-bold text-amber-200">{c.pending_pages} gambar baru</strong>
                            </p>
                            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                              <Button onClick={() => void reviewWork(w, "approve_revision", c.id)} disabled={busy === c.id}>
                                <FiCheck size={11} /> Setujui
                              </Button>
                              <Button variant="danger" onClick={() => void reviewWork(w, "reject_revision", c.id)} disabled={busy === c.id}>
                                <FiX size={11} /> Tolak
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(w.chapters?.length ?? 0) > 0 && (
                    <div className="mt-3 rounded-md border border-white/[.06]">
                      <p className="border-b border-white/[.05] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/35">
                        Chapter ({w.pendingChapters?.length ?? 0} menunggu)
                      </p>
                      <ul className="divide-y divide-white/[.05]">
                        {(w.chapters || []).map((c) => (
                          <li key={c.id} className="px-2.5 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate text-[11px] text-white/70">
                                Ch. {c.chapter_number}{c.title ? ` · ${c.title}` : ""} · {c.pages} gambar
                              </span>
                              <span className={`shrink-0 text-[10px] font-bold ${c.is_published ? "text-emerald-300" : "text-amber-300"}`}>
                                {c.is_published ? "Terbit" : "Menunggu"}
                              </span>
                            </div>
                            {!c.is_published && (
                              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                                <Button onClick={() => void reviewWork(w, "approve_chapter", c.id)} disabled={busy === c.id}>
                                  <FiCheck size={11} /> Terbitkan
                                </Button>
                                <Button variant="danger" onClick={() => void reviewWork(w, "reject_chapter", c.id)} disabled={busy === c.id}>
                                  <FiX size={11} /> Tolak
                                </Button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === "scanlator" && (
        <>
          {[...active, ...suspended, ...revoked].map((s) => (
            <Panel key={s.user_id}>
              <div className="flex items-start justify-between gap-3 px-4 pt-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold">{s.team_name} <span className="font-normal text-white/35">@{s.handle}</span></p>
                  <p className="mt-0.5 text-[11px] text-white/35">
                    {s.username || s.user_id.slice(0, 8)} · {timeAgo(s.created_at)} lalu{s.verified ? " · terverifikasi" : ""}{s.warnings > 0 ? ` · ${s.warnings} SP` : ""}
                  </p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold ${s.status === "active" ? "text-emerald-300" : s.status === "suspended" ? "text-amber-300" : "text-rose-300"}`}>
                  {s.status === "active" ? "Aktif" : s.status === "suspended" ? "Suspend" : "Dicabut"}
                </span>
              </div>

              <div className="px-4 pt-2"><Contacts wa={s.contact_wa} tg={s.contact_telegram} dc={s.contact_discord} /></div>

              {s.status === "suspended" && s.suspended_until && (
                <p className="px-4 pt-1.5 text-[10px] font-semibold text-amber-300/80">s.d. {new Date(s.suspended_until).toLocaleDateString("id-ID")}</p>
              )}
              {s.moderation_note && <p className="px-4 pt-1 text-[10px] text-white/30">Catatan: {s.moderation_note}</p>}

              <div className="px-4 pt-2">
                <button type="button" onClick={() => void toggleUserProjects(s.user_id)} className="flex w-full items-center gap-1 rounded-md border border-white/[.07] px-2.5 py-1.5 text-[11px] font-bold text-[var(--accent-2)]">
                  <FiBookOpen size={11} />
                  {openUser === s.user_id ? "Sembunyikan project" : "Lihat project"}
                  {userWorks[s.user_id] && (
                    <span className="ml-auto text-[10px] font-semibold text-white/35">{userWorks[s.user_id].length} seri</span>
                  )}
                </button>

                {openUser === s.user_id && (
                  <ul className="mt-2 divide-y divide-white/[.05] overflow-hidden rounded-md border border-white/[.06]">
                    {(userWorks[s.user_id] || []).map((w) => (
                      <li key={w.slug} className="flex items-center gap-2.5 px-2.5 py-2">
                        {w.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={w.cover_url} alt="" loading="lazy" className="h-10 w-8 shrink-0 rounded border border-white/[.07] object-cover" />
                        ) : (
                          <span className="flex h-10 w-8 shrink-0 items-center justify-center rounded border border-white/[.07] bg-white/[.04] text-[9px] text-white/25">—</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <a
                            href={`/komik/project/${w.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-[11px] font-semibold text-white/80 hover:text-white"
                          >
                            {w.title}
                          </a>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-white/35">
                            <span className={w.is_published ? "text-emerald-300/80" : w.review_status === "rejected" ? "text-rose-300/80" : "text-amber-300/80"}>
                              {w.is_published ? "Terbit" : w.review_status === "rejected" ? "Ditolak" : "Menunggu"}
                            </span>
                            <span>·</span>
                            <span>{w.chapters_published ?? 0}/{w.chapters_total ?? 0} chapter</span>
                            <span>·</span>
                            <span>{w.view_count} tayangan</span>
                          </p>
                          {w.review_note && <p className="mt-0.5 line-clamp-1 text-[10px] text-rose-300/60">{w.review_note}</p>}
                        </div>
                      </li>
                    ))}
                    {(userWorks[s.user_id] || []).length === 0 && (
                      <li className="px-2.5 py-3 text-[11px] text-white/30">Belum ada project.</li>
                    )}
                  </ul>
                )}
              </div>

              <div className="p-4 pt-3">
                <input
                  value={notes[s.user_id] || ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [s.user_id]: e.target.value }))}
                  placeholder="Alasan / catatan…"
                  className={inputClass}
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button variant="warn" onClick={() => void call({ user_id: s.user_id, action: "warn", reason: notes[s.user_id] || "Pelanggaran", note: notes[s.user_id] || "" }, `SP diberikan ke ${s.team_name}.`)} disabled={busy === s.user_id}>
                    <FiAlertTriangle size={12} /> SP
                  </Button>
                  <Button variant="warn" onClick={() => void call({ user_id: s.user_id, action: "suspend", days: 7, reason: notes[s.user_id] || "Pelanggaran", note: notes[s.user_id] || "" }, `${s.team_name} suspend 7 hari.`)} disabled={busy === s.user_id}>
                    <FiSlash size={12} /> Suspend
                  </Button>
                  {s.status !== "revoked" ? (
                    <Button variant="danger" className="col-span-2" onClick={() => void call({ user_id: s.user_id, action: "revoke", reason: notes[s.user_id] || "Pelanggaran berat", note: notes[s.user_id] || "" }, `Akses ${s.team_name} dicabut.`)} disabled={busy === s.user_id}>
                      <FiUserX size={12} /> Cabut akses
                    </Button>
                  ) : (
                    <Button className="col-span-2" onClick={() => void call({ user_id: s.user_id, action: "restore", note: notes[s.user_id] || "" }, `Akses ${s.team_name} dipulihkan.`)} disabled={busy === s.user_id}>
                      <FiCheck size={12} /> Pulihkan akses
                    </Button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void call(
                      { user_id: s.user_id, action: s.verified ? "unverify" : "verify", note: notes[s.user_id] || "" },
                      s.verified ? `Verifikasi ${s.team_name} dicabut.` : `${s.team_name} terverifikasi.`,
                    )
                  }
                  disabled={busy === s.user_id}
                  className="mt-2 w-full rounded-md border border-white/[.08] py-1.5 text-[10px] font-semibold text-[var(--accent-2)] transition-colors hover:bg-white/[.04]"
                >
                  {s.verified ? "Cabut verifikasi" : "Tandai terverifikasi"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ userId: s.user_id, team: s.team_name })}
                  disabled={busy === s.user_id}
                  className="mt-2 w-full rounded-md py-1.5 text-[10px] font-semibold text-rose-300/60 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                >
                  Hapus tim permanen
                </button>
              </div>
            </Panel>
          ))}
          {!loading && scanlators.length === 0 && <p className="py-10 text-center text-[12px] text-white/30">Belum ada Scanlator.</p>}
        </>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-white/[.08] bg-[#111115] p-4">
            <p className="text-[13px] font-bold text-white">Hapus tim “{deleteTarget.team}”?</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
              Profil grup dihapus, akses Scanlator dicabut, dan semua seri tim ini disembunyikan dari publik (karya tidak dihapus).
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button onClick={() => setDeleteTarget(null)}>Batal</Button>
              <Button
                variant="danger"
                onClick={() => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  void call(
                    { user_id: target.userId, action: "delete", reason: "Tim dihapus admin", note: notes[target.userId] || "" },
                    `Tim ${target.team} dihapus.`,
                  );
                }}
              >
                <FiTrash2 size={12} /> Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === "laporan" && (
        <Panel>
          <PanelHead title="Laporan & banding" desc={`${reports.filter((r) => r.status === "open").length} menunggu tindakan`} />
          {reports.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12px] text-white/30">Belum ada laporan.</p>
          ) : (
            <ul className="divide-y divide-white/[.05]">
              {reports.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-white/85">
                        {r.kind === "appeal" ? "Banding" : r.kind === "copyright" ? "Hak cipta" : "Lainnya"} · {r.reason}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/35">
                        {r.reporter || "user"} · {r.target_slug || r.target_handle || "—"} · {timeAgo(r.created_at)} lalu
                      </p>
                      {r.detail && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/45">{r.detail}</p>}
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold ${r.status === "open" ? "text-amber-300" : r.status === "resolved" ? "text-emerald-300" : "text-white/35"}`}>
                      {r.status === "open" ? "Baru" : r.status === "resolved" ? "Selesai" : "Diabaikan"}
                    </span>
                  </div>
                  {r.status === "open" && (
                    <>
                      <input
                        value={notes[r.id] || ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                        placeholder="Catatan tindakan…"
                        className={`${inputClass} mt-2`}
                      />
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Button onClick={() => void resolveReport(r.id, "resolve")} disabled={busy === r.id}><FiCheck size={12} /> Selesaikan</Button>
                        <Button variant="ghost" onClick={() => void resolveReport(r.id, "dismiss")} disabled={busy === r.id}><FiX size={12} /> Abaikan</Button>
                      </div>
                    </>
                  )}
                  {r.admin_note && <p className="mt-1 text-[10px] text-white/30">Catatan: {r.admin_note}</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === "moderasi" && (
        <Panel>
          <PanelHead title="Riwayat moderasi" desc={`${moderation.length} tindakan terakhir`} />
          {moderation.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12px] text-white/30">Belum ada tindakan.</p>
          ) : (
            <ul className="divide-y divide-white/[.05]">
              {moderation.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-white/75">{m.team_name || m.user_id.slice(0, 8)} <span className="text-white/30">· {labelAction(m.action)}</span></p>
                    {(m.note || m.reason) && <p className="truncate text-[10px] text-white/30">{m.note || m.reason}</p>}
                  </div>
                  <span className="shrink-0 text-[10px] text-white/25">{timeAgo(m.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}

function labelAction(action: string) {
  return ({ warn: "SP", suspend: "Suspend", revoke: "Cabut akses", restore: "Pulihkan", delete: "Hapus tim", verify: "Verifikasi", unverify: "Cabut verifikasi" } as Record<string, string>)[action] || action;
}

function Contacts({ wa, tg, dc }: { wa: string | null; tg: string | null; dc: string | null }) {
  const chip = "inline-flex min-h-[30px] items-center gap-1 rounded-md bg-[var(--accent)]/15 px-2.5 text-[11px] font-semibold text-[var(--accent-2)]";
  if (dc) {
    return (
      <a href={`https://discord.com/users/${dc}`} target="_blank" rel="noreferrer noopener" className={chip}>
        <FiMessageCircle size={11} /> Discord · {dc}
      </a>
    );
  }
  if (tg) return <a href={`https://t.me/${tg}`} target="_blank" rel="noreferrer noopener" className={chip}><FiMessageCircle size={11} /> Telegram · {tg}</a>;
  if (wa) return <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer noopener" className={chip}><FiMessageCircle size={11} /> WA · {wa}</a>;
  return <p className="text-[10px] text-amber-300/60">Discord belum diisi</p>;
}
