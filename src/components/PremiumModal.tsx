"use client";

import { useEffect, useState } from "react";
import { FaCrown, FaTimes, FaCheckCircle } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import {
  clearCachedProfile,
  isActivePremiumProfile,
  loadCachedProfile,
} from "@/utils/profileCache";
import Button from "@/components/Button";

type PremiumProfile = {
  is_premium?: boolean;
  premium_until?: string | null;
};

type PremiumCode = {
  id: string;
  duration_days: number;
};

type PremiumModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function PremiumModal({ open, onClose }: PremiumModalProps) {
  const { user } = useSupabaseUser();
  const [loading, setLoading] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [profile, setProfile] = useState<PremiumProfile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ADMIN_WA = "6282224227170";
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    async function loadStatus() {
      if (!user) return;

      const data = await loadCachedProfile(user.id);

      if (!data) return;

      setIsPremium(isActivePremiumProfile(data));
      setProfile(data);
    }

    loadStatus();
  }, [open, user]);

  async function redeemPremium() {
    setError(null);
    setMessage(null);

    if (!redeemCode) {
      setError("Masukkan kode premium");
      return;
    }

    setLoading(true);

    if (!user) {
      setError("Silakan login terlebih dahulu");
      setLoading(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Silakan login terlebih dahulu");
      setLoading(false);
      return;
    }

    // Claim + grant happen atomically on the server so the same code cannot be
    // redeemed twice and the browser never touches premium_codes directly.
    const res = await fetch("/api/premium/redeem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: redeemCode }),
    });

    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(json?.error || "Kode tidak valid atau sudah dipakai");
      setLoading(false);
      return;
    }

    clearCachedProfile(user.id);
    window.dispatchEvent(new Event("rk-profile-updated"));
    setLoading(false);
    setMessage("Premium berhasil diaktifkan 🎉");

    // kasih jeda biar user lihat pesan
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  }

  const isExpired =
  profile?.premium_until &&
  new Date(profile.premium_until) < new Date();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        className="rk-card w-full max-w-md rounded-3xl p-5"
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="flex items-center gap-2 font-bold text-lg">
            <FaCrown className="text-cyan-200" />
            Premium Ryukomik
          </h2>
          <button onClick={onClose} className="text-white/60 text-lg">
            <FaTimes />
          </button>
        </div>

        {!isPremium ? (
          <>
            <ul className="mt-4 text-sm text-white/80 space-y-1">
              <li>✔ Bebas iklan</li>
              <li>✔ Reader lebih nyaman</li>
              <li>✔ Mendukung server</li>
            </ul>

            {/* INPUT */}
            <input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="Masukkan kode premium"
              className="rk-input mt-4 w-full rounded-2xl px-3 py-3 text-sm"
            />

            {/* ERROR */}
            {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

            {/* SUCCESS */}
            {message && (
              <div className="mt-3 text-sm text-green-400 flex items-center gap-2">
                <FaCheckCircle /> {message}
              </div>
            )}

            {/* BUTTON */}
            <Button
              onClick={redeemPremium}
              disabled={loading}
              className="mt-5 w-full rounded-2xl py-3 font-bold disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Redeem Premium"}
            </Button>
            {/* Arahkan ke /premium untuk lihat fitur + beli */}
            <Button
              variant="ghost"
              onClick={() => {
                onClose();
                router.push("/premium-pay");
              }}
              className="mt-3 w-full rounded-2xl py-3 font-bold"
            >
              Lihat Fitur Premium
            </Button>

            <p className="mt-3 text-xs text-white/40 text-center">
              Premium aktif sesuai durasi kode
            </p>
          </>
        ) : (
          <div
            onClick={() => router.push("/premium-pay")}
            className="rk-card-soft mt-6 cursor-pointer rounded-2xl p-5"
          >
            {/* ICON */}
            <div className="flex items-center justify-center mb-3">
              <FaCrown className="text-3xl text-cyan-200" />
            </div>

            {/* STATUS */}
            <p className="text-sm text-gray-400 text-center">
              {isExpired ? "Premium kamu sudah habis" : "Premium aktif sampai"}
            </p>

            {/* DATE */}
            <p
              className="font-semibold mt-1 text-center text-lg"
              style={{ color: "#67e8f9" }}
            >
              {profile?.premium_until
                ? new Date(profile.premium_until).toLocaleDateString("id-ID")
                : "-"}
            </p>

            {/* CTA */}
            <div className="mt-4 text-center">
              <span className="rk-btn-primary inline-block rounded-xl px-4 py-2 text-sm font-bold">
                {isExpired ? "Perpanjang Premium" : "Lihat Benefit"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
