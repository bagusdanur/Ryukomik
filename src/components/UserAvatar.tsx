"use client";

import { avatarBorderShadow, IMAGE_FRAME_SCALE, isImageBorder, resolveAvatarBorder } from "@/lib/avatarBorders";

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
        // Digambar lebih besar dari kotak avatar lalu dipusatkan (translate),
        // jadi ornamen frame tetap simetris di semua ukuran avatar.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frame.src}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 max-w-none select-none object-contain"
          style={{
            width: Math.round(size * (borderDef.scale ?? IMAGE_FRAME_SCALE)),
            height: Math.round(size * (borderDef.scale ?? IMAGE_FRAME_SCALE)),
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
    </span>
  );
}
