"use client";

import { avatarBorderShadow, resolveAvatarBorder } from "@/lib/avatarBorders";

/**
 * Satu-satunya komponen avatar di situs. Border diambil dari registry
 * (avatarBorders) sehingga sistem "Avatar Border" nanti cukup mengisi id-nya
 * di profil — semua permukaan otomatis ikut.
 */
export default function UserAvatar({
  src,
  name,
  size = 40,
  border,
  ring,
  className = "",
  eager = false,
  alt,
  shape = "circle",
  showRing = true,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  /** id border dari registry (mis. "gold", "event"). */
  border?: string | null;
  /** Override warna ring (dipakai untuk medali podium). */
  ring?: string;
  className?: string;
  eager?: boolean;
  alt?: string;
  /** Bentuk wadah: bulat penuh (default) atau sudut membulat seperti kartu. */
  shape?: "circle" | "rounded";
  /** Matikan ring bawaan kalau wadahnya sudah punya border sendiri. */
  showRing?: boolean;
}) {
  const label = (name || "?").trim();
  const initial = label.charAt(0).toUpperCase() || "?";
  const shadow = showRing ? avatarBorderShadow(border, ring) : undefined;
  const borderDef = resolveAvatarBorder(border);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-white/[0.06] ${
        shape === "rounded" ? "rounded-xl" : "rounded-full"
      } ${className}`}
      style={{ width: size, height: size, boxShadow: shadow }}
      title={borderDef.id === "default" ? undefined : `Border ${borderDef.label}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ""}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span
          className="font-black uppercase leading-none text-white/40"
          style={{ fontSize: Math.max(10, size * 0.36) }}
        >
          {initial}
        </span>
      )}
    </span>
  );
}
