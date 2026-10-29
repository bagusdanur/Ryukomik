"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type BanState = {
  banned: boolean;
  permanent?: boolean;
  bannedUntil?: string | null;
  reason?: string | null;
  contactUrl?: string;
};

function formatUntil(state: BanState) {
  if (state.permanent) return "permanen";
  if (!state.bannedUntil) return "permanen";
  const date = new Date(state.bannedUntil);
  if (Number.isNaN(date.getTime())) return "permanen";
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

/**
 * Gerbang blokir: kalau akun sedang diblokir, seluruh situs ditutup layer
 * penuh. Satu-satunya aksi yang tersedia adalah logout — sesuai kebijakan
 * "diblokir tidak bisa akses apa pun kecuali keluar".
 */
export default function BanGate() {
  const { user } = useSupabaseUser();
  const [state, setState] = useState<BanState | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setState(null);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/me/ban-status", {
        cache: "no-store",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = (await res.json()) as BanState;
      if (active && json?.banned) setState(json);
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!state?.banned) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [state?.banned]);

  if (!state?.banned) return null;

  const contact = state.contactUrl || "https://chat.whatsapp.com/JJjlXcgdm90H5qNaJiXPDV";

  async function logout() {
    setLeaving(true);
    await supabase.auth.signOut().catch(() => undefined);
    window.location.href = "/";
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070a12] px-5 py-8">
      <div className="w-full max-w-md rounded-2xl border border-rose-400/25 bg-rose-500/[0.06] p-6 text-center text-white shadow-[0_20px_80px_rgba(0,0,0,.6)]">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-rose-500/15 text-2xl">🚫</div>
        <h1 className="text-lg font-black">Akun Kamu Diblokir</h1>
        <p className="mt-1 text-xs leading-relaxed text-white/60">
          Akses situs dan akun ditutup sementara sampai blokir dicabut admin.
        </p>

        <div className="mt-4 space-y-2 rounded-xl bg-black/25 p-3 text-left text-[11px] text-white/70">
          <p>
            <span className="font-bold text-white/50">Berakhir:</span> {formatUntil(state)}
          </p>
          <p>
            <span className="font-bold text-white/50">Alasan:</span>{" "}
            {state.reason?.trim() ? state.reason : "tidak disebutkan"}
          </p>
        </div>

        <a
          href={contact}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-400"
        >
          💬 Tanya / Ajukan Buka Blokir (Grup WhatsApp)
        </a>

        <button
          type="button"
          onClick={logout}
          disabled={leaving}
          className="mt-2 w-full rounded-xl border border-white/12 px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/[0.06] disabled:opacity-50"
        >
          {leaving ? "Keluar..." : "Logout"}
        </button>

        <p className="mt-3 text-[10px] text-white/30">
          Setelah logout kamu tetap bisa membaca sebagai tamu, tapi tidak bisa memakai akun.
        </p>
      </div>
    </div>
  );
}
