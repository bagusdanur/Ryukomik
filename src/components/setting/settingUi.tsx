import { THEME_COLORS } from "@/components/ThemeColorProvider";
import type { ReactNode } from "react";

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <p className="mb-2 mt-8 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
        {label}
      </p>
      <div className="rk-card-soft overflow-hidden rounded-2xl divide-y divide-white/10">
        {children}
      </div>
    </>
  );
}

export function Item({ icon, label, value }: { icon: ReactNode; label: string; value?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <RowLeft icon={icon} label={label} />
      {value && <span className="text-white/40 text-sm">{value}</span>}
    </div>
  );
}

export function RowLeft({ icon, label }: { icon: ReactNode; label: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </div>
  );
}

export function ThemePreview({ themeKey }: { themeKey?: string }) {
  const theme = THEME_COLORS.find((item) => item.key === themeKey) || THEME_COLORS[0];

  return (
    <span className="flex items-center gap-2 text-sm text-white/45">
      <span className="hidden max-w-[120px] truncate sm:inline">{theme.name}</span>
      <span className="flex items-center gap-1">
        {[theme.background, theme.surface1, theme.accent, theme.accent2].map((color) => (
          <span
            key={color}
            className="h-3.5 w-3.5 rounded-full border border-white/15"
            style={{ background: color }}
          />
        ))}
      </span>
    </span>
  );
}

export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rk-card-soft flex flex-col items-center rounded-2xl p-3">
      <p className="text-[10px] font-bold uppercase text-white/45">{label}</p>
      <p className="text-lg font-black text-white">{value}</p>
    </div>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-4"
      onClick={onClose}
    >
      <div
        className="rk-card mb-6 w-full max-w-sm rounded-2xl p-5"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function Toast({ toast }: { toast?: { type: "success" | "error"; message: string } | null }) {
  if (!toast) return null;

  return (
    <div
      className={`fixed right-6 top-6 z-50 rounded-2xl bg-[var(--surface-1)] px-4 py-2 text-sm ${
        toast.type === "success"
          ? "border border-green-500/30 text-white/80"
          : "border border-red-500/30 text-white/80"
      }`}
    >
      {toast.message}
    </div>
  );
}
