import { supabaseAdmin } from "@/lib/supabaseServer";

export const APK_SETTING_KEY = "apk_download";

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

export async function getApkSettings(): Promise<ApkSettings> {
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("key, value, updated_at")
    .eq("key", APK_SETTING_KEY)
    .maybeSingle();

  if (error) {
    return {
      ...fallbackApkSettings,
      configured: false,
    };
  }

  const row = data as ApkSettingRow | null;
  return normalizeApkSettings({
    ...row?.value,
    updated_at: row?.updated_at || null,
    configured: Boolean(row),
  });
}

export async function setApkSettings(settings: ApkSettings): Promise<ApkSettings> {
  const normalized = normalizeApkSettings(settings);
  const updatedAt = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .upsert(
      {
        key: APK_SETTING_KEY,
        value: {
          downloadUrl: normalized.downloadUrl,
          version: normalized.version,
          changelog: normalized.changelog,
          enabled: normalized.enabled,
        },
        updated_at: updatedAt,
      },
      { onConflict: "key" },
    )
    .select("key, value, updated_at")
    .single();

  if (error) throw error;

  const row = data as ApkSettingRow;
  return normalizeApkSettings({
    ...row.value,
    updated_at: row.updated_at || updatedAt,
    configured: true,
  });
}
