import { revalidateTag, unstable_cache } from "next/cache";
import { getAppSetting, setAppSetting } from "@/lib/social/settingsStore";
import { getLocalSetting, invalidateLocalSetting } from "@/lib/localSettings";

export const APK_SETTING_KEY = "apk_download";
export const APK_SETTINGS_CACHE_TAG = "apk-settings";

export type ApkSettings = {
  downloadUrl: string;
  version: string;
  changelog: string[];
  enabled: boolean;
  updated_at?: string | null;
  configured?: boolean;
};

type ApkSettingRow = {
  key: string;
  value?: Partial<Omit<ApkSettings, "updated_at" | "configured">> | null;
  updated_at?: string | null;
};

export const fallbackApkSettings: ApkSettings = {
  downloadUrl:
    "https://github.com/bagusdanur/Ryukomik/releases/download/v1.0.1/Ryukomik.1.0.1.apk",
  version: "1.0.1",
  changelog: [
    "Perbaikan tampilan daftar komik.",
    "Thumbnail dibuat lebih rapi dan konsisten.",
    "Perbaikan sistem bug report.",
    "Peningkatan stabilitas aplikasi.",
    "Persiapan fitur baru untuk update berikutnya.",
  ],
  enabled: true,
  updated_at: null,
  configured: false,
};

export function normalizeApkSettings(value?: Partial<ApkSettings> | null): ApkSettings {
  const changelog = Array.isArray(value?.changelog)
    ? value.changelog
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : fallbackApkSettings.changelog;

  return {
    downloadUrl: String(value?.downloadUrl || fallbackApkSettings.downloadUrl).trim(),
    version: String(value?.version || fallbackApkSettings.version).trim(),
    changelog: changelog.length ? changelog : fallbackApkSettings.changelog,
    enabled: value?.enabled !== false,
    updated_at: value?.updated_at ?? null,
    configured: value?.configured ?? false,
  };
}

const APK_LOCAL_KEY = `app_settings:${APK_SETTING_KEY}`;

async function loadApkRow(): Promise<ApkSettingRow | null> {
  const row = await getAppSetting<ApkSettingRow["value"]>(APK_SETTING_KEY);
  if (!row) return null;
  return { key: APK_SETTING_KEY, value: row.value, updated_at: row.updated_at } as ApkSettingRow;
}

async function readApkSettings(): Promise<ApkSettings> {
  const row = await getLocalSetting<ApkSettingRow | null>(APK_LOCAL_KEY, loadApkRow);
  return normalizeApkSettings({
    ...row?.value,
    updated_at: row?.updated_at || null,
    configured: Boolean(row),
  });
}

// app_settings is read on every /apk render (twice) plus admin routes, while the
// row only changes when an admin saves it. Cache across requests and invalidate
// from setApkSettings so a save is reflected immediately.
export const getApkSettings = unstable_cache(readApkSettings, [APK_SETTINGS_CACHE_TAG], {
  revalidate: 300,
  tags: [APK_SETTINGS_CACHE_TAG],
});

export async function setApkSettings(settings: ApkSettings): Promise<ApkSettings> {
  const normalized = normalizeApkSettings(settings);
  const updatedAt = new Date().toISOString();

  const data = await setAppSetting(APK_SETTING_KEY, {
    downloadUrl: normalized.downloadUrl,
    version: normalized.version,
    changelog: normalized.changelog,
    enabled: normalized.enabled,
    updatedAt,
  });

  invalidateLocalSetting(APK_LOCAL_KEY);
  revalidateTag(APK_SETTINGS_CACHE_TAG, { expire: 0 });

  const row = data as ApkSettingRow;
  return normalizeApkSettings({
    ...row.value,
    updated_at: row.updated_at || updatedAt,
    configured: true,
  });
}
