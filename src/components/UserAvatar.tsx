"use client";

import { avatarBorderShadow, isImageBorder, resolveAvatarBorder } from "@/lib/avatarBorders";

/**
 * Satu-satunya komponen avatar di situs. Border diambil dari registry
 * (avatarBorders) sehingga sistem "Avatar Border" cukup mengisi id-nya di
 * profil — semua permukaan otomatis ikut.
 *
 * Mendukung dua tipe border: ring CSS dan frame gambar (PNG/SVG) yang
 * ditumpuk di atas avatar.
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
  /** id border dari registry (mis. "gold", "contoh"). */
  border?: string | null;
  /** Override warna ring (hanya berlaku saat belum pilih border). */
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
  const borderDef = resolveAvatarBorder(border);
  const frame = isImageBorder(borderDef) ? borderDef : null;
  const shadow = showRing && !frame ? avatarBorderShadow(border, ring) : undefined;
  // Frame bisa diperbesar (scale) dan boleh berada di atas atau di belakang avatar.
  const frameSize = frame ? Math.round(size * (frame.scale ?? 1.5)) : 0;
  const inset = frame ? Math.round((frameSize - size) / 2) : 0;
  const under = frame?.layer === "under";
  const shiftX = frame ? (frame.offsetX ?? 0) * frameSize : 0;
  const shiftY = frame ? (frame.offsetY ?? 0) * frameSize : 0;

  const frameNode = frame ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={frame.src}
      alt=""
      aria-hidden
      draggable={false}
      className={`pointer-events-none absolute select-none ${under ? "z-0" : "z-20"}`}
      style={{
        width: frameSize,
        height: frameSize,
        left: -inset + shiftX,
        top: -inset + shiftY,
      }}
    />
  ) : null;

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {under && frameNode}
      <span
        className={`relative z-10 inline-flex h-full w-full items-center justify-center overflow-hidden bg-white/[0.06] ${
          shape === "rounded" ? "rounded-xl" : "rounded-full"
        } ${className}`}
        style={{ boxShadow: shadow }}
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

      {!under && frameNode}
    </span>
  );
}
