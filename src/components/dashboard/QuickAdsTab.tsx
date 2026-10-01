"use client";

import { useState } from "react";
import {
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiSave,
  FiTrash2,
  FiZap,
} from "react-icons/fi";

export type AdProviderForm = {
  id: string;
  name: string;
  enabled: boolean;
  scriptUrl: string;
  zoneId: string;
  imageUrl?: string;
  targetUrl?: string;
};

export type AdsConfigForm = {
  masterEnabled: boolean;
  validationMode: "bebas" | "terkunci";
  allowedHosts: string[];
  providers: AdProviderForm[];
  updatedAt?: string | null;
  updatedBy?: string | null;
  hasPrevious?: boolean;
};

type QuickAdsTabProps = {
  loading: boolean;
  saving: boolean;
  rolling: boolean;
  notice: string;
  settings: AdsConfigForm;
  fetchSettings: () => void;
  saveSettings: (nextSettings?: AdsConfigForm) => void;
  rollbackSettings: () => void;
  setSettings: (settings: AdsConfigForm) => void;
};

const MAX_PROVIDERS = 10;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

const inputClass =
  "mt-2 w-full rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-3 text-[12px] text-white outline-none focus:border-violet-400/50";
const labelClass = "text-[11px] font-semibold text-white/45";

export default function QuickAdsTab({
  loading,
  saving,
  rolling,
  notice,
  settings,
  fetchSettings,
  saveSettings,
  rollbackSettings,
  setSettings,
}: QuickAdsTabProps) {
  const busy = loading || saving || rolling;
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const update = (patch: Partial<AdsConfigForm>) =>
    setSettings({ ...settings, ...patch });

  const updateProvider = (index: number, patch: Partial<AdProviderForm>) => {
    const providers = settings.providers.map((p, i) =>
      i === index ? { ...p, ...patch } : p,
    );
    update({ providers });
  };

  const addProvider = () => {
    if (settings.providers.length >= MAX_PROVIDERS) return;
    const n = settings.providers.length + 1;
    update({
      providers: [
        ...settings.providers,
        {
          id: slugify(`ad-${n}-${Date.now()}`) || `ad-${n}`,
          name: `Iklan ${n}`,
          enabled: true,
          scriptUrl: "",
          zoneId: "",
          imageUrl: "",
          targetUrl: "",
        },
      ],
    });
  };

  const removeProvider = (index: number) => {
    update({ providers: settings.providers.filter((_, i) => i !== index) });
  };

  const applyPreset = (type: "monetag" | "rajaapk") => {
    if (type === "monetag") {
      update({
        providers: [
          ...settings.providers,
          {
            id: slugify("monetag") + (settings.providers.length ? `-${settings.providers.length + 1}` : ""),
            name: "Monetag",
            enabled: true,
            scriptUrl: "https://al5sm.com/tag.min.js",
            zoneId: "",
            imageUrl: "",
            targetUrl: "",
          },
        ],
      });
    } else {
      update({
        providers: [
          ...settings.providers,
          {
            id: slugify("rajaapk") + (settings.providers.length ? `-${settings.providers.length + 1}` : ""),
            name: "RajaAPK",
            enabled: true,
            scriptUrl: "https://gaslah.my.id/",
            zoneId: "",
            imageUrl: "",
            targetUrl: "",
          },
        ],
      });
    }
  };

  const totalActive =
    settings.masterEnabled
      ? settings.providers.filter((p) => p.enabled && p.scriptUrl).length
      : 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveSettings();
      }}
      className="space-y-4"
    >
      {/* Header + master */}
      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <FiZap size={18} className="text-violet-300" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">Quick Ads</p>
              <p className="text-[10px] text-white/30">
                Kelola iklan global · {totalActive} aktif
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchSettings}
            disabled={busy}
            className="w-9 h-9 rounded-lg bg-white/[.05] border border-white/[.08] flex items-center justify-center text-white/45 hover:text-white transition-colors disabled:opacity-50"
            title="Muat ulang"
          >
            <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-white/[.04] px-3 py-3">
          <div>
            <p className="text-[12px] font-bold text-white">
              {settings.masterEnabled ? "Semua iklan AKTIF" : "Semua iklan MATI"}
            </p>
            <p className="mt-0.5 text-[10px] text-white/35">
              {settings.masterEnabled
                ? "Iklan tampil untuk user gratis di semua halaman."
                : "Tidak ada iklan yang dimuat, di halaman mana pun."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.masterEnabled}
            onClick={() => update({ masterEnabled: !settings.masterEnabled })}
            disabled={busy}
            className={`relative h-7 w-12 shrink-0 overflow-hidden rounded-full border transition-colors disabled:opacity-50 ${
              settings.masterEnabled
                ? "border-violet-300/40 bg-violet-400/80"
                : "border-white/[.08] bg-white/[.08]"
            }`}
          >
            <span
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                settings.masterEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Mode validasi */}
        <div className="mt-3 rounded-xl border border-white/[.06] bg-white/[.04] px-3 py-3">
          <p className="text-[11px] font-semibold text-white/60">
            Mode domain
          </p>
          <div className="mt-2 flex gap-2">
            {(["bebas", "terkunci"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => update({ validationMode: mode })}
                disabled={busy}
                className={`flex-1 h-9 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 ${
                  settings.validationMode === mode
                    ? "bg-violet-500 text-white"
                    : "bg-white/[.05] text-white/50 hover:text-white"
                }`}
              >
                {mode === "bebas" ? "Bebas (apa aja)" : "Terkunci (allowlist)"}
              </button>
            ))}
          </div>
          {settings.validationMode === "terkunci" && (
            <input
              value={settings.allowedHosts.join(", ")}
              onChange={(e) =>
                update({
                  allowedHosts: e.target.value
                    .split(",")
                    .map((h) => h.trim().toLowerCase())
                    .filter(Boolean),
                })
              }
              placeholder="al5sm.com, gaslah.my.id"
              className={inputClass}
            />
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-white/30">
            HTTPS wajib, HTML mentah dilarang, host berbahaya (localhost/IP
            privat) diblokir otomatis.
          </p>
        </div>

        {notice && (
          <p className="mt-4 rounded-xl border border-white/[.06] bg-white/[.04] px-3 py-2 text-[11px] font-semibold text-white/60">
            {notice}
          </p>
        )}
      </div>

      {/* Daftar provider */}
      <div className="space-y-3">
        {settings.providers.length === 0 && (
          <div className="bg-[#13131a] border border-dashed border-white/[.10] rounded-2xl p-6 text-center">
            <FiAlertTriangle className="mx-auto text-amber-300/70" size={20} />
            <p className="mt-2 text-[12px] font-semibold text-white/60">
              Belum ada iklan
            </p>
            <p className="mt-1 text-[10px] text-white/30">
              Tambahkan iklan di bawah ini.
            </p>
          </div>
        )}

        {settings.providers.map((provider, index) => {
          const isOpen = open[provider.id] ?? true;
          return (
            <div
              key={provider.id + index}
              className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setOpen((s) => ({ ...s, [provider.id]: !isOpen }))
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {isOpen ? (
                    <FiChevronUp size={14} className="text-white/40" />
                  ) : (
                    <FiChevronDown size={14} className="text-white/40" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-white">
                      {provider.name || provider.id}
                    </p>
                    <p className="truncate text-[10px] text-white/30">
                      {provider.scriptUrl || "URL belum diisi"}
                    </p>
                  </div>
                </button>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={provider.enabled}
                    onClick={() =>
                      updateProvider(index, { enabled: !provider.enabled })
                    }
                    disabled={busy}
                    className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full border transition-colors disabled:opacity-50 ${
                      provider.enabled
                        ? "border-violet-300/40 bg-violet-400/80"
                        : "border-white/[.08] bg-white/[.08]"
                    }`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        provider.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProvider(index)}
                    disabled={busy}
                    className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-400/20 flex items-center justify-center text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    title="Hapus iklan"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className={labelClass}>Nama</span>
                    <input
                      value={provider.name}
                      onChange={(e) =>
                        updateProvider(index, { name: e.target.value })
                      }
                      placeholder="Monetag"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Script URL (HTTPS)</span>
                    <input
                      value={provider.scriptUrl}
                      onChange={(e) =>
                        updateProvider(index, { scriptUrl: e.target.value })
                      }
                      placeholder="https://quge5.com/88/tag.min.js"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>
                      Zone ID (opsional, angka saja)
                    </span>
                    <input
                      value={provider.zoneId}
                      onChange={(e) =>
                        updateProvider(index, {
                          zoneId: e.target.value.replace(/[^\d]/g, ""),
                        })
                      }
                      placeholder="197371"
                      inputMode="numeric"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>
                      Image URL banner (opsional)
                    </span>
                    <input
                      value={provider.imageUrl || ""}
                      onChange={(e) =>
                        updateProvider(index, { imageUrl: e.target.value })
                      }
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>
                      Target URL banner (opsional)
                    </span>
                    <input
                      value={provider.targetUrl || ""}
                      onChange={(e) =>
                        updateProvider(index, { targetUrl: e.target.value })
                      }
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Aksi tambah */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addProvider}
          disabled={busy || settings.providers.length >= MAX_PROVIDERS}
          className="flex-1 h-10 rounded-xl bg-white/[.05] border border-white/[.08] text-[12px] font-bold text-white/70 hover:text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
        >
          <FiPlus size={15} /> Tambah Iklan
        </button>
        <button
          type="button"
          onClick={() => applyPreset("monetag")}
          disabled={busy || settings.providers.length >= MAX_PROVIDERS}
          className="h-10 px-3 rounded-xl bg-white/[.05] border border-white/[.08] text-[11px] font-semibold text-white/50 hover:text-white transition-colors disabled:opacity-40"
        >
          + Monetag
        </button>
        <button
          type="button"
          onClick={() => applyPreset("rajaapk")}
          disabled={busy || settings.providers.length >= MAX_PROVIDERS}
          className="h-10 px-3 rounded-xl bg-white/[.05] border border-white/[.08] text-[11px] font-semibold text-white/50 hover:text-white transition-colors disabled:opacity-40"
        >
          + RajaAPK
        </button>
      </div>

      {/* Simpan & rollback */}
      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-white/60">
              Status konfigurasi
            </p>
            <p className="mt-0.5 text-[10px] text-white/30">
              {settings.updatedAt
                ? `Terakhir diubah ${new Date(settings.updatedAt).toLocaleString("id-ID")}`
                : "Belum pernah diubah (default)"}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-xl bg-violet-500 text-white text-[13px] font-black flex items-center justify-center gap-2 hover:bg-violet-400 transition-colors disabled:opacity-50"
        >
          <FiSave size={16} />
          {saving ? "Menyimpan..." : "Simpan Konfigurasi Iklan"}
        </button>

        <button
          type="button"
          onClick={rollbackSettings}
          disabled={busy || !settings.hasPrevious}
          className="w-full h-10 rounded-xl bg-white/[.05] border border-white/[.08] text-[12px] font-bold text-amber-200/80 hover:text-amber-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
        >
          <FiRotateCcw size={15} />
          {rolling ? "Memulihkan..." : "Pulihkan Konfigurasi Sebelumnya"}
        </button>
      </div>
    </form>
  );
}
