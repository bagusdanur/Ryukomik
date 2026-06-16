"use client";

import { FiRefreshCw } from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";

export type YukiAiSettings = {
  enabled: boolean;
  updated_at?: string | null;
};

type YukiAiSettingsTabProps = {
  loading: boolean;
  saving: boolean;
  notice: string;
  settings: YukiAiSettings;
  fetchSettings: () => void;
  saveSettings: (enabled: boolean) => void;
};

export default function YukiAiSettingsTab({
  loading,
  saving,
  notice,
  settings,
  fetchSettings,
  saveSettings,
}: YukiAiSettingsTabProps) {
  const toggleYukiStatus = () => {
    saveSettings(!settings.enabled);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <HiOutlineSparkles size={18} className="text-violet-400" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">Yuki AI Widget</p>
              <p className="text-[10px] text-white/30">
                Kelola widget AI Chat Ryukomik
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchSettings}
            disabled={loading || saving}
            className="w-9 h-9 rounded-lg bg-white/[.05] border border-white/[.08] flex items-center justify-center text-white/45 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-white/[.04] px-3 py-3">
          <div>
            <p className="text-[12px] font-bold text-white">
              {settings.enabled ? "Yuki AI Aktif" : "Yuki AI Nonaktif"}
            </p>
            <p className="mt-0.5 text-[10px] text-white/35">
              {settings.enabled
                ? "Widget chat AI ditampilkan di halaman utama web."
                : "Widget dinonaktifkan sepenuhnya di seluruh web."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            onClick={toggleYukiStatus}
            disabled={loading || saving}
            className={`relative h-7 w-12 shrink-0 overflow-hidden rounded-full border transition-colors disabled:opacity-50 ${
              settings.enabled
                ? "border-violet-300/40 bg-violet-500/80"
                : "border-white/[.08] bg-white/[.08]"
            }`}
            title={settings.enabled ? "Matikan Yuki AI" : "Nyalakan Yuki AI"}
          >
            <span
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                settings.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {notice && (
          <p className="mt-4 rounded-xl border border-white/[.06] bg-white/[.04] px-3 py-2 text-[11px] font-semibold text-white/60">
            {notice}
          </p>
        )}
      </div>

      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
        <div className="rounded-xl border border-white/[.06] bg-white/[.04] px-3 py-3">
          <p className="text-[12px] font-bold text-white mb-1">
            Informasi Integrasi
          </p>
          <p className="text-[11px] leading-relaxed text-white/50">
            Widget AI ini secara otomatis tidak akan ditampilkan di halaman detail komik (`/komik/*`) dan
            pembaca chapter (`/chapter/*`), sesuai dengan pengaturan global.
          </p>
        </div>
      </div>
    </div>
  );
}
