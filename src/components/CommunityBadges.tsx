/**
 * Badge komunitas bertingkat — murni CSS + SVG inline (tanpa emoji, tanpa file
 * gambar, nol tambahan bandwidth/egress).
 *
 * Gaya mengikuti contoh yang disukai owner: pil solid satu warna, teks kapital
 * pendek, tanpa gradient dan tanpa glow. Warna sengaja bukan emas (emas milik
 * VIP): VETERAN oranye, RAJIN abu-abu gelap — hierarki terlihat dari terang ke
 * "muted".
 *
 * Angka aktivitasnya diambil dari `social_profiles` (PostgreSQL VPS) yang
 * disinkronkan dari Supabase oleh profileSync — badge ini tidak pernah menyentuh
 * Supabase. Permukaan komentar komik/latest memakai `profiles.total_reads` dari
 * query yang memang sudah ada (kolom ditambah, query tidak bertambah).
 *
 * Ambang tingkatan ada di BADGE_TIERS saja.
 */

import type { ReactNode } from "react";

export const BADGE_TIERS = [
  {
    key: "veteran",
    label: "VETERAN",
    minReads: 1000,
    bg: "#f97316", // oranye solid (bukan emas — emas khusus VIP)
    text: "#ffffff",
  },
  {
    key: "rajin",
    label: "RAJIN",
    minReads: 300,
    bg: "#475569", // abu-abu gelap, sengaja lebih "muted"
    text: "#ffffff",
  },
] as const;

export type BadgeTier = (typeof BADGE_TIERS)[number];

/** Tier tertinggi yang sudah dicapai, atau null kalau belum ada. */
export function communityTier(totalReads?: number | null): BadgeTier | null {
  const reads = Number(totalReads) || 0;
  return BADGE_TIERS.find((tier) => reads >= tier.minReads) || null;
}

/** Ikon SVG inline (bukan emoji): mahkota untuk veteran, panah naik untuk rajin. */
function TierIcon({ tier }: { tier: BadgeTier }) {
  if (tier.key === "veteran") {
    return (
      <svg viewBox="0 0 12 12" width="8" height="8" aria-hidden focusable="false">
        <path
          d="M1 9.4 L2 3.6 L4.2 5.8 L6 2.6 L7.8 5.8 L10 3.6 L11 9.4 Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" width="8" height="8" aria-hidden focusable="false">
      <path d="M6 2 L10 7 L7.4 7 L7.4 10 L4.6 10 L4.6 7 L2 7 Z" fill="currentColor" />
    </svg>
  );
}

export default function CommunityBadges({
  totalReads,
  className = "",
}: {
  totalReads?: number | null;
  className?: string;
}): ReactNode {
  const tier = communityTier(totalReads);
  if (!tier) return null;
  const reads = Math.max(0, Math.floor(Number(totalReads) || 0));

  return (
    <span
      title={`${reads.toLocaleString("id-ID")} chapter dibaca`}
      className={`inline-flex items-center gap-[3px] rounded-full px-1.5 py-[2px] text-[9px] font-black uppercase leading-none tracking-wide ${className}`}
      style={{
        background: tier.bg,
        color: tier.text,
      }}
    >
      <TierIcon tier={tier} />
      {tier.label}
    </span>
  );
}
