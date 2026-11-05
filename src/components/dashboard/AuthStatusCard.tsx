"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCheckCircle, FiKey, FiRefreshCw, FiShieldOff, FiUsers, FiXCircle } from "react-icons/fi";

type AuthStatus = {
  googleConfigured: boolean;
  authLocalEnabled: boolean;
  supabaseFallback: boolean;
  counts: {
    users: number;
    sessions_active: number;
    sessions_24h: number;
    logged_in_24h: number;
    last_login_at: string | null;
  } | null;
};

function relative(iso: string | null) {
  if (!iso) return "belum ada";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

/** Kartu status auth lokal di dashboard: apakah login Google baru hidup. */
export default function AuthStatusCard({ getAdminToken }: { getAdminToken: () => Promise<string> }) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAdminToken();
      const response = await fetch("/api/admin/auth-status", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.ok) setStatus((await response.json()) as AuthStatus);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [getAdminToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = Boolean(status?.googleConfigured && status?.authLocalEnabled);
  const counts = status?.counts;

  return (
    <div className="rounded-2xl border border-white/[.06] bg-[#13131a] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              active ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
            }`}
          >
            <FiKey size={17} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Login Google (auth lokal)</p>
            <p className="mt-0.5 text-[11px] text-white/35">
              {active ? "Aktif — user bisa login lewat jalur baru" : "Belum aktif — kredensial atau flag belum lengkap"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          aria-label="Muat ulang status auth"
          className="rounded-lg border border-white/10 p-2 text-white/40 transition hover:text-white"
        >
          <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/30" title="Jumlah akun yang punya identitas login (auth_users)">Akun Login</p>
          <p className="mt-0.5 text-sm font-bold text-white">{(counts?.users ?? 0).toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/30">Sesi aktif</p>
          <p className="mt-0.5 text-sm font-bold text-white">{(counts?.sessions_active ?? 0).toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/30">Login 24 jam</p>
          <p className="mt-0.5 text-sm font-bold text-white">{(counts?.logged_in_24h ?? 0).toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/30">Login terakhir</p>
          <p className="mt-0.5 text-sm font-bold text-white">{relative(counts?.last_login_at ?? null)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
            status?.googleConfigured ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
          }`}
        >
          {status?.googleConfigured ? <FiCheckCircle size={11} /> : <FiXCircle size={11} />}
          Kredensial Google
        </span>
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
            status?.authLocalEnabled ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"
          }`}
        >
          {status?.authLocalEnabled ? <FiCheckCircle size={11} /> : <FiShieldOff size={11} />}
          Flag NEXT_PUBLIC_AUTH_LOCAL
        </span>
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
            status?.supabaseFallback ? "bg-sky-500/10 text-sky-300" : "bg-white/[.04] text-white/40"
          }`}
        >
          <FiUsers size={11} />
          {status?.supabaseFallback ? "Fallback Supabase aktif" : "Tanpa fallback Supabase"}
        </span>
      </div>
    </div>
  );
}
