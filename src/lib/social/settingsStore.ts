import "server-only";

import { socialQuery } from "@/lib/social/db";

export type AppSettingRow<T> = { value: T; updated_at: string };

/** Baca satu setting dari app_settings lokal. */
export async function getAppSetting<T>(key: string): Promise<AppSettingRow<T> | null> {
  const { rows } = await socialQuery<AppSettingRow<T>>(
    "select value, updated_at from app_settings where key = $1",
    [key],
  );
  return rows[0] ?? null;
}

/** Simpan/ganti satu setting, lalu kembalikan nilai tersimpan. */
export async function setAppSetting<T>(key: string, value: unknown): Promise<AppSettingRow<T>> {
  const { rows } = await socialQuery<AppSettingRow<T>>(
    `insert into app_settings (key, value, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()
     returning value, updated_at`,
    [key, JSON.stringify(value)],
  );
  return rows[0];
}
