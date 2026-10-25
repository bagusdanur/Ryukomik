"use client";

import { IMAGE_FRAME_SCALE, avatarBorderShadow, isImageBorder, resolveAvatarBorder } from "@/lib/avatarBorders";

/**
 * Satu-satunya komponen avatar di situs.
 *
 * Border CSS  : ring + glow dari CSS.
 * Border frame: gambar transparan dipasang 1:1 di atas avatar (kotak yang sama),
 *               tanpa diperbesar/digeser — foto profil tinggal mengisi kotaknya
 *               dan terlihat lewat lubang frame.
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
  border?: string | null;
  ring?: string;
  className?: string;
  eager?: boolean;
  alt?: string;
  shape?: "circle" | "rounded";
  showRing?: boolean;
}) {
  const label = (name || "?").trim();
  const initial = label.charAt(0).toUpperCase() || "?";
  const borderDef = resolveAvatarBorder(border);
  const frame = isImageBorder(borderDef) ? borderDef : null;
  const shadow = showRing && !frame ? avatarBorderShadow(border, ring) : undefined;

  // Frame diperbesar dari TITIK LUBANGNYA (bukan dari tengah kanvas), jadi
  // avatar selalu duduk tepat di lubang berapa pun besar frame-nya.
  const frameSize = size * IMAGE_FRAME_SCALE;
  const holeX = frame?.holeX ?? 0.5;
  const holeY = frame?.holeY ?? 0.5;
  const frameStyle = {
    width: frameSize,
    height: frameSize,
    left: size / 2 - holeX * frameSize,
    top: size / 2 - holeY * frameSize,
  } as const;

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className={`relative inline-flex h-full w-full items-center justify-center overflow-hidden bg-white/[0.06] ${
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

      {frame && (
        // Frame digambar sedikit lebih besar dari kotak avatar (lihat
        // IMAGE_FRAME_SCALE) dan tetap terpusat — tanpa offset per frame.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frame.src}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute z-20 select-none object-contain"
          style={frameStyle}
        />
      )}
    </span>
  );
}
