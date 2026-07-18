"use client";
import { FaCheckCircle, FaBookOpen, FaExclamationTriangle, FaFolderOpen } from "react-icons/fa";
import {
  MANGA_SOURCES,
  ADULT_SOURCES,
  NOVEL_SOURCES,
  PROJECT_SOURCES,
  type SourceConfig,
} from "@/config/sources";

interface SourcePickerProps {
  source: string;
  onSelect: (id: string) => void;
  onAdultGate?: (id: string) => void;
}

function SourceChip({
  config,
  isActive,
  onClick,
}: {
  config: SourceConfig;
  isActive: boolean;
  onClick: () => void;
}) {
  const isAdult = config.group === "adult";

  const activeColorStr = `var(--${config.activeColor})`;

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all
        ${
          isActive
            ? ""
            : "bg-white/[0.06] text-white/60 border border-white/[0.08] hover:bg-white/[0.1] hover:text-white/80"
        }`}
      style={
        isActive
          ? {
              backgroundColor: `color-mix(in srgb, ${activeColorStr} 15%, transparent)`,
              color: activeColorStr,
              border: `1px solid color-mix(in srgb, ${activeColorStr} 30%, transparent)`,
            }
          : undefined
      }
    >
      {/* Badge 18+ — absolute di kiri atas chip */}
      {isAdult && (
        <span
          className="absolute -top-1.5 -left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-3) 15%, transparent)",
            color: "var(--accent-3)",
            borderColor: "color-mix(in srgb, var(--accent-3) 20%, transparent)",
          }}
        >
          18+
        </span>
      )}

      <span>{config.label}</span>
      {isActive && (
        <FaCheckCircle className="text-[10px]" style={{ color: activeColorStr }} />
      )}
    </button>
  );
}

function SectionDivider() {
  return <div className="border-t border-white/5 my-4" />;
}

export default function SourcePicker({ source, onSelect, onAdultGate }: SourcePickerProps) {
  const handleSelect = (config: SourceConfig) => {
    if (config.gate === "age+login" && onAdultGate) {
      onAdultGate(config.id);
    } else {
      onSelect(config.id);
    }
  };

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-[70]
        rk-card rounded-t-2xl p-5 pt-4 pb-safe
        animate-slideUp

        md:absolute md:bottom-auto md:left-auto md:right-0 md:top-full
        md:mt-2 md:min-w-[240px] md:rounded-2xl md:p-4
        md:animate-fadeIn
      `}
    >
      {/* Drag handle — mobile only */}
      <div className="flex justify-center mb-4 md:hidden">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      <div className="space-y-0">
        {/* Translate Group (Project) */}
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider mb-3">
            <FaBookOpen className="text-[11px]" /> Project
          </p>
          <div className="flex flex-wrap gap-3">
            {PROJECT_SOURCES.map(config => (
              <SourceChip
                key={config.id}
                config={config}
                isActive={source === config.id}
                onClick={() => handleSelect(config)}
              />
            ))}
          </div>
        </div>

        <SectionDivider />

        {/* Manga Group */}
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">
            <FaBookOpen className="text-[11px]" /> Komik
          </p>
          <div className="flex flex-wrap gap-3">
            {MANGA_SOURCES.map(config => (
              <SourceChip
                key={config.id}
                config={config}
                isActive={source === config.id}
                onClick={() => handleSelect(config)}
              />
            ))}
          </div>
        </div>

        <SectionDivider />

        {/* Adult Group */}
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-400/80 uppercase tracking-wider mb-3">
            <FaExclamationTriangle className="text-[11px]" /> 18+
          </p>
          <div className="flex flex-wrap gap-3">
            {ADULT_SOURCES.map(config => (
              <SourceChip
                key={config.id}
                config={config}
                isActive={source === config.id}
                onClick={() => handleSelect(config)}
              />
            ))}
          </div>
        </div>

        <SectionDivider />

        {/* Novel Group */}
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">
            <FaFolderOpen className="text-[11px]" /> Lainnya
          </p>
          <div className="flex flex-wrap gap-3">
            {NOVEL_SOURCES.map(config => (
              <SourceChip
                key={config.id}
                config={config}
                isActive={source === config.id}
                onClick={() => handleSelect(config)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
