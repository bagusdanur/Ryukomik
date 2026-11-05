"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FiAlertTriangle, FiCheck, FiClock, FiMessageCircle, FiRefreshCw, FiSlash, FiUserX, FiX,
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
  status: string; warnings: number; suspended_until: string | null; moderation_note: string | null;
  contact_wa: string | null; contact_telegram: string | null; contact_discord: string | null;
  created_at: string; username: string | null;
};

type ModerationRow = { id: string; user_id: string; action: string; reason: string | null; note: string | null; created_at: string; team_name: string | null };
type WorkReview = { id: string; slug: string; title: string; cover_url: string | null; type: string | null; is_adult: boolean; scanlator_handle: string | null; scanlator_team: string | null };

type TabId = "pengajuan" | "karya" | "scanlator" | "moderasi";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "pengajuan", label: "Pengajuan" },
  { id: "karya", label: "Project" },
  { id: "scanlator", label: "Scanlator" },
  { id: "moderasi", label: "Moderasi" },
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
        const j = (await aRes.json()) as { applications?: Application[]; scanlators?: Scanlator[]; moderation?: ModerationRow[] };
        setApps(j.applications || []); setScanlators(j.scanlators || []); setModeration(j.moderation || []);
      }
      if (wRes.ok) setWorks(((await wRes.json()) as { works?: WorkReview[] }).works || []);
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
      if (!res.ok || !json?.success) { setNotice(json?.error || "Gagal."); return; }
      setNotice(action === "approve" ? `“${work.title}” terbit.` : `“${work.title}” ditolak.`);
      await load();
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
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button onClick={() => void reviewWork(w, "approve")} disabled={busy === w.id}><FiCheck size={12} /> Terbitkan</Button>
                    <Button variant="danger" onClick={() => void reviewWork(w, "reject")} disabled={busy === w.id}><FiX size={12} /> Tolak</Button>
                  </div>
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
                    {s.username || s.user_id.slice(0, 8)} · {timeAgo(s.created_at)} lalu{s.warnings > 0 ? ` · ${s.warnings} SP` : ""}
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
              </div>
            </Panel>
          ))}
          {!loading && scanlators.length === 0 && <p className="py-10 text-center text-[12px] text-white/30">Belum ada Scanlator.</p>}
        </>
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
  return ({ warn: "SP", suspend: "Suspend", revoke: "Cabut akses", restore: "Pulihkan" } as Record<string, string>)[action] || action;
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
