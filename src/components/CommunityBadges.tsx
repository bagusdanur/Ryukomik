/**
 * Badge komunitas bertingkat — murni CSS + SVG inline (tanpa emoji, tanpa file
 * gambar, nol tambahan bandwidth/egress).
 *
 * Konsep: "tier chip" — bingkai gradient vertikal (gelap di bawah -> warna
 * tingkatan di atas) membungkus inti gelap, jadi kesannya naik ke atas.
 * Sengaja berbeda dari badge VIP (pil bulat warna padat) supaya tidak terlihat
 * meniru desain lain.
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
    edgeFrom: "#4a3306", // gelap di bawah
    edgeTo: "#f5c542", // emas di atas
    core: "#14100a",
    text: "#f7d67a",
    ring: "rgba(245, 197, 66, 0.35)",
  },
  {
    key: "rajin",
    label: "RAJIN",
    minReads: 300,
    edgeFrom: "#241640",
    edgeTo: "#a78bfa",
    core: "#120e1e",
    text: "#c9b6ff",
    ring: "rgba(167, 139, 250, 0.35)",
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
      className={`inline-flex rounded-[7px] p-[1.5px] ${className}`}
      style={{
        // bingkai gradient vertikal: gelap di bawah, terang di atas
        background: `linear-gradient(to top, ${tier.edgeFrom}, ${tier.edgeTo})`,
        boxShadow: `0 1px 5px ${tier.ring}`,
      }}
    >
      <span
        className="inline-flex items-center gap-[3px] rounded-[5.5px] px-[5px] py-[2.5px] text-[8px] font-black uppercase leading-none tracking-[0.08em]"
        style={{
          background: `linear-gradient(to bottom, rgba(255,255,255,0.07), rgba(255,255,255,0)), ${tier.core}`,
          color: tier.text,
        }}
      >
        <TierIcon tier={tier} />
        {tier.label}
      </span>
    </span>
  );
}
