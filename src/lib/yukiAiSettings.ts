import { supabaseAdmin } from "@/lib/supabaseServer";

const YUKI_AI_SETTING_KEY = "yuki_ai_widget";

type YukiAiSettingRow = {
  key: string;
  value?: {
    enabled?: boolean;
  } | null;
  updated_at?: string | null;
};

export async function getYukiAiSettings() {
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("key, value, updated_at")
    .eq("key", YUKI_AI_SETTING_KEY)
    .maybeSingle();

  if (error) {
    return {
      enabled: true, // Default to true if there's an error/not configured
      configured: false,
    };
  }

  const row = data as YukiAiSettingRow | null;

  return {
    enabled: row?.value?.enabled !== false, // Default to true if row/value is missing
    configured: Boolean(row),
    updated_at: row?.updated_at || null,
  };
}

export async function setYukiAiSettings(enabled: boolean) {
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .upsert(
      {
        key: YUKI_AI_SETTING_KEY,
        value: { enabled },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    )
    .select("key, value, updated_at")
    .single();

  if (error) throw error;

  const row = data as YukiAiSettingRow;

  return {
    enabled: row.value?.enabled !== false,
    configured: true,
    updated_at: row.updated_at || null,
  };
}
