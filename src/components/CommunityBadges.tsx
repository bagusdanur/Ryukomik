/**
 * Badge komunitas bertingkat — murni CSS + SVG inline (tanpa emoji, tanpa file
 * gambar, nol tambahan bandwidth/egress).
 *
 * Desain sengaja dibuat berbeda dari badge VIP (pil bulat): bentuk "tab" dengan
 * sudut kanan-bawah terpotong dan gradient vertikal dari gelap (bawah) ke warna
 * tingkatan (atas), supaya tidak terlihat meniru badge lain.
 *
 * Angka aktivitasnya diambil dari `social_profiles` (PostgreSQL VPS) yang
 * disinkronkan dari Supabase oleh profileSync — jadi badge ini tidak pernah
 * menyentuh Supabase.
 *
 * Ambang tingkatan ada di BADGE_TIERS saja.
 */

import type { ReactNode } from "react";

export const BADGE_TIERS = [
  {
    key: "veteran",
    label: "VETERAN",
    minReads: 1000,
    // gelap di bawah -> emas di atas
    from: "#2a1c05",
    to: "#f0b429",
    text: "#1b1204",
    ring: "rgba(240, 180, 41, 0.35)",
  },
  {
    key: "rajin",
    label: "RAJIN",
    minReads: 300,
    from: "#180f2c",
    to: "#a78bfa",
    text: "#150c26",
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
      <svg viewBox="0 0 12 12" width="9" height="9" aria-hidden focusable="false">
        <path
          d="M1 9.4 L2 3.6 L4.2 5.8 L6 2.6 L7.8 5.8 L10 3.6 L11 9.4 Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" width="9" height="9" aria-hidden focusable="false">
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
      className={`inline-flex items-center gap-1 px-1.5 py-[3px] text-[8px] font-black uppercase leading-none tracking-widest ${className}`}
      style={{
        // gradient vertikal: gelap di bawah, warna tingkatan di atas
        background: `linear-gradient(to top, ${tier.from}, ${tier.to})`,
        color: tier.text,
        // sudut kanan-bawah terpotong -> bentuk tab, bukan pil seperti VIP
        clipPath:
          "polygon(0 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%)",
        boxShadow: `0 1px 5px ${tier.ring}`,
      }}
    >
      <TierIcon tier={tier} />
      {tier.label}
    </span>
  );
}
