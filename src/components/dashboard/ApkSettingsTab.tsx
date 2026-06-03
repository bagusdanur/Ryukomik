"use client";

import { FormEvent, useMemo } from "react";
import { FiDownload, FiExternalLink, FiRefreshCw, FiSave, FiSmartphone } from "react-icons/fi";

export type ApkSettingsForm = {
  downloadUrl: string;
  version: string;
  changelog: string;
  enabled: boolean;
  updated_at?: string | null;
};

type ApkSettingsTabProps = {
  loading: boolean;
  saving: boolean;
  notice: string;
  settings: ApkSettingsForm;
  fetchSettings: () => void;
  saveSettings: (nextSettings?: ApkSettingsForm) => void;
  setSettings: (settings: ApkSettingsForm) => void;
};

export default function ApkSettingsTab({
  loading,
  saving,
  notice,
  settings,
  fetchSettings,
  saveSettings,
  setSettings,
}: ApkSettingsTabProps) {
  const previewLog = useMemo(
    () =>
      settings.changelog
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    [settings.changelog],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveSettings();
  };

  const toggleApkStatus = () => {
    const nextSettings = { ...settings, enabled: !settings.enabled };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <FiSmartphone size={18} className="text-cyan-300" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">APK Download</p>
              <p className="text-[10px] text-white/30">
                URL, versi, dan log update
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
              {settings.enabled ? "APK tersedia" : "APK maintenance"}
            </p>
            <p className="mt-0.5 text-[10px] text-white/35">
              {settings.enabled
                ? "User bisa download dan update APK seperti biasa."
                : "Download ditutup, user diarahkan baca lewat web."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            onClick={toggleApkStatus}
            disabled={loading || saving}
            className={`relative h-7 w-12 shrink-0 overflow-hidden rounded-full border transition-colors disabled:opacity-50 ${
              settings.enabled
                ? "border-cyan-300/40 bg-cyan-400/80"
                : "border-white/[.08] bg-white/[.08]"
            }`}
            title={settings.enabled ? "Matikan APK" : "Nyalakan APK"}
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

      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 space-y-4">
        <label className="block">
          <span className="text-[11px] font-semibold text-white/45">
            Download URL
          </span>
          <input
            value={settings.downloadUrl}
            onChange={(event) =>
              setSettings({ ...settings, downloadUrl: event.target.value })
            }
            placeholder="https://..."
            className="mt-2 w-full rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-3 text-[12px] text-white outline-none focus:border-cyan-400/50"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-semibold text-white/45">
            Versi APK
          </span>
          <input
            value={settings.version}
            onChange={(event) =>
              setSettings({ ...settings, version: event.target.value })
            }
            placeholder="1.0.2"
            className="mt-2 w-full rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-3 text-[12px] text-white outline-none focus:border-cyan-400/50"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-semibold text-white/45">
            Log Update
          </span>
          <textarea
            value={settings.changelog}
            onChange={(event) =>
              setSettings({ ...settings, changelog: event.target.value })
            }
            rows={7}
            placeholder="Satu log per baris"
            className="mt-2 w-full resize-none rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-3 text-[12px] leading-relaxed text-white outline-none focus:border-cyan-400/50"
          />
        </label>

        <button
          type="submit"
          disabled={loading || saving}
          className="w-full h-11 rounded-xl bg-cyan-500 text-[#071014] text-[13px] font-black flex items-center justify-center gap-2 hover:bg-cyan-300 transition-colors disabled:opacity-50"
        >
          <FiSave size={16} />
          {saving ? "Menyimpan..." : "Simpan Setting APK"}
        </button>
      </div>

      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold text-white/70">
              Preview Halaman APK
            </p>
            <p className="text-[10px] text-white/30">
              v{settings.version || "-"}
            </p>
          </div>
          <a
            href={settings.enabled ? settings.downloadUrl || "/apk" : "https://ryukomik.my.id"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg bg-white/[.05] border border-white/[.08] flex items-center justify-center text-white/45 hover:text-white transition-colors"
            title={settings.enabled ? "Buka URL download" : "Buka Ryukomik.my.id"}
          >
            {settings.enabled ? <FiDownload size={14} /> : <FiExternalLink size={14} />}
          </a>
        </div>

        {settings.enabled ? (
          <ul className="mt-3 space-y-2">
            {previewLog.length > 0 ? (
              previewLog.map((item) => (
                <li
                  key={item}
                  className="rounded-xl bg-white/[.04] px-3 py-2 text-[11px] text-white/60"
                >
                  {item}
                </li>
              ))
            ) : (
              <li className="text-[11px] text-white/25">Belum ada log update</li>
            )}
          </ul>
        ) : (
          <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/10 px-3 py-3">
            <p className="text-[12px] font-bold text-amber-100">
              APK sedang maintenance
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/50">
              APK Ryukomik sementara tidak tersedia. User tetap diarahkan baca
              lewat Ryukomik.my.id.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
