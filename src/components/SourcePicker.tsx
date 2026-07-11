"use client";
import { FaCheckCircle } from "react-icons/fa";
import {
  MANGA_SOURCES,
  ADULT_SOURCES,
  NOVEL_SOURCES,
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
  
  // Using CSS var color-mix matching existing globals.css patterns
  const activeColorStr = `var(--${config.activeColor})`;

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all
        ${
          isActive
            ? "" // Styling dynamically applied below via inline style
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
      <span>{config.label}</span>
      {isAdult && <span className="text-[10px] font-bold" style={{ color: "var(--accent-3)" }}>18+</span>}
      {isActive && (
        <FaCheckCircle className="text-[10px]" style={{ color: activeColorStr }} />
      )}
    </button>
  );
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
        fixed bottom-0 left-0 right-0 z-50
        rk-card rounded-t-3xl p-4 pt-3
        animate-slideUp
        
        md:absolute md:bottom-auto md:left-auto md:right-0 md:top-full
        md:mt-2 md:min-w-[240px] md:rounded-2xl
        md:animate-fadeIn
      `}
    >
      <div className="flex justify-center mb-3 md:hidden">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      <div className="space-y-4">
        {/* Manga Group */}
        <div>
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
            📚 Manga
          </p>
          <div className="flex flex-wrap gap-2">
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

        {/* Adult Group */}
        <div>
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
            🔞 18+
          </p>
          <div className="flex flex-wrap gap-2">
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

        {/* Novel Group */}
        <div>
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
            📖 Lainnya
          </p>
          <div className="flex flex-wrap gap-2">
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
