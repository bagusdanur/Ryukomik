"use client";
import { FiX, FiSettings } from "react-icons/fi";
import type { ReactNode } from "react";
import type { ImageScaling, PageSpacing, ReadingMode, useReaderSettings } from "./hooks/useReaderSettings";

const ACCENT = "#22d3ee";

interface Option<T extends string> {
  label: string;
  value: T;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-[1.2px] uppercase mb-1.5"
       style={{ color: `${ACCENT}cc` }}>
      {children}
    </p>
  );
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  cols,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  cols?: number;
}) {
  const colClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[cols ?? options.length] ?? "grid-cols-3";

  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className={`grid ${colClass} gap-1.5`}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="py-1.5 px-1 rounded-lg text-xs cursor-pointer transition-all duration-150"
              style={{
                border: active ? `1px solid ${ACCENT}` : "1px solid rgba(255,255,255,0.08)",
                background: active ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                color: active ? ACCENT : "rgba(255,255,255,0.5)",
                fontWeight: active ? 600 : 500,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  displayValue?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <SectionLabel>{label}</SectionLabel>
        <span className="text-xs font-semibold -mt-1.5" style={{ color: ACCENT }}>
          {displayValue ?? value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-[3px] rounded-sm outline-none cursor-pointer"
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          background: "rgba(255,255,255,0.1)",
          accentColor: ACCENT,
        }}
      />
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/55">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="relative flex-shrink-0 cursor-pointer transition-all duration-200 p-0"
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: value ? ACCENT : "rgba(34,211,238,0.14)",
          border: `1px solid ${value ? ACCENT : "rgba(34,211,238,0.28)"}`,
        }}
      >
        <span
          className="absolute w-3.5 h-3.5 rounded-full bg-white transition-all duration-200"
          style={{ left: value ? "18px" : "3px", top: "50%", transform: "translateY(-50%)" }}
        />
      </button>
    </div>
  );
}

const Divider = () => (
  <div className="h-px my-0.5" style={{ background: "rgba(255,255,255,0.06)" }} />
);

interface ReaderSettingModalProps {
  settings: ReturnType<typeof useReaderSettings>;
  onClose: () => void;
}

export default function ReaderSettingModal({ settings, onClose }: ReaderSettingModalProps) {
  const {
    autoNext,        setAutoNext,
    scrollSpeed,     setScrollSpeed,
    tapScrollAmount, setTapScrollAmount,
    readingMode,     setReadingMode,
    imageScaling,    setImageScaling,
    pageSpacing,     setPageSpacing,
  } = settings;

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rk-card flex w-full flex-col overflow-hidden rounded-3xl"
        style={{
          maxWidth: 360,
          maxHeight: "88vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${ACCENT}26` }}
            >
              <FiSettings size={14} style={{ color: ACCENT }} />
            </div>
            <span className="text-[13px] font-semibold text-white tracking-wide uppercase">
              Reader Settings
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <FiX size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3.5 flex flex-col gap-3.5 overflow-y-auto flex-1">
          <OptionGroup<ReadingMode>
            label="Reading Mode"
            value={readingMode}
            onChange={setReadingMode}
            options={[
              { label: "Full",   value: "full"   },
              { label: "Single", value: "single" },
              { label: "Double", value: "double" },
            ]}
          />

          <OptionGroup<ImageScaling>
            label="Image Scaling"
            value={imageScaling}
            onChange={setImageScaling}
            options={[
              { label: "Original",   value: "original"  },
              { label: "Fit Width",  value: "fitwidth"  },
              { label: "Fit Screen", value: "fitscreen" },
            ]}
          />

          <OptionGroup<PageSpacing>
            label="Page Spacing"
            value={pageSpacing}
            onChange={setPageSpacing}
            cols={4}
            options={[
              { label: "None",    value: "none"    },
              { label: "Small",   value: "small"   },
              { label: "Medium",  value: "medium"  },
              { label: "Webtoon", value: "webtoon" },
            ]}
          />

          <Divider />

          <SliderRow
            label="Auto Scroll Speed"
            value={scrollSpeed}
            min={1}
            max={20}
            displayValue={`${scrollSpeed}%`}
            onChange={setScrollSpeed}
          />

          <SliderRow
            label="Tap Scroll Distance"
            value={tapScrollAmount}
            min={100}
            max={900}
            step={50}
            displayValue={tapScrollAmount >= 900 ? "Max" : `${tapScrollAmount}px`}
            onChange={setTapScrollAmount}
          />

          <Divider />

          <ToggleRow
            label="Auto Next Chapter"
            value={autoNext}
            onChange={setAutoNext}
          />
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rk-btn-primary w-full cursor-pointer rounded-2xl border-none py-2.5 text-[13px] font-bold tracking-wide text-white"
          >
            Finish
          </button>
        </div>
      </div>
    </div>
  );
}
