"use client";

import type { ReactNode } from "react";

/**
 * UI kit flat untuk halaman Scanlator.
 * Aturan desain: radius kecil (10–12px), border 1px tipis, tanpa gradient/glow,
 * teks 12–13px, target sentuh ≥ 40px, satu kolom di mobile.
 */

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/[.07] bg-white/[.02] ${className}`}>
      {children}
    </div>
  );
}

export function PanelHead({ title, desc, right }: { title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[.06] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-bold leading-tight text-white">{title}</p>
        {desc && <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs, active, onChange,
}: { tabs: Array<{ id: T; label: string }>; active: T; onChange: (id: T) => void }) {
  return (
    <div className="overflow-x-auto border-b border-white/[.07] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-5 px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`-mb-px whitespace-nowrap border-b-2 py-3 text-[12px] font-bold transition-colors ${
              active === t.id ? "border-[var(--accent)] text-white" : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Field({
  label, hint, children, htmlFor,
}: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold text-white/60">
        {label}
        {hint && <span className="ml-1.5 font-normal text-white/30">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 outline-none transition-colors focus:border-[var(--accent)]/60";

export function Button({
  children, onClick, type = "button", variant = "primary", disabled, className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "danger" | "warn";
  disabled?: boolean;
  className?: string;
}) {
  const base = "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3.5 text-[12px] font-bold transition-colors disabled:opacity-40";
  const variants = {
    primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent)]/85",
    ghost: "border border-white/[.1] text-white/70 hover:bg-white/[.05] hover:text-white",
    danger: "border border-rose-400/25 text-rose-300 hover:bg-rose-500/10",
    warn: "border border-amber-400/25 text-amber-200 hover:bg-amber-500/10",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function StatusDot({ tone }: { tone: "ok" | "warn" | "bad" | "idle" }) {
  const cls = { ok: "bg-emerald-400", warn: "bg-amber-400", bad: "bg-rose-400", idle: "bg-white/25" }[tone];
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${cls}`} />;
}

export function Row({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border-b border-white/[.05] px-4 py-3 last:border-0 ${className}`}>{children}</div>;
}

/** Kartu ringkas tanpa border tebal — dipakai untuk angka statistik. */
export function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "warn" | "bad" }) {
  const color = tone === "ok" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : tone === "bad" ? "text-rose-300" : "text-white";
  return (
    <div className="rounded-lg border border-white/[.06] bg-white/[.02] px-3 py-2.5">
      <p className={`text-base font-bold leading-none ${color}`}>{value}</p>
      <p className="mt-1 text-[10px] font-medium text-white/35">{label}</p>
    </div>
  );
}
