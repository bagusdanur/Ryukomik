import { revalidateTag, unstable_cache } from "next/cache";
import { getAppSetting, setAppSetting } from "@/lib/social/settingsStore";
import { getLocalSetting, invalidateLocalSetting } from "@/lib/localSettings";

const TITLE_RUSH_SETTING_KEY = "title_rush_event";
export const TITLE_RUSH_EVENT_STATUS_TAG = "title-rush-event-status";
const TITLE_RUSH_EVENT_STATUS_TTL = 5 * 60;

type TitleRushSettingRow = {
  key: string;
  value?: {
    enabled?: boolean;
  } | null;
  updated_at?: string | null;
};

const TITLE_RUSH_LOCAL_KEY = `app_settings:${TITLE_RUSH_SETTING_KEY}`;

async function loadTitleRushRow(): Promise<TitleRushSettingRow | null> {
  const row = await getAppSetting<TitleRushSettingRow["value"]>(TITLE_RUSH_SETTING_KEY);
  if (!row) return null;
  return { key: TITLE_RUSH_SETTING_KEY, value: row.value, updated_at: row.updated_at } as TitleRushSettingRow;
}

async function readTitleRushEventStatus() {
  const row = await getLocalSetting<TitleRushSettingRow | null>(TITLE_RUSH_LOCAL_KEY, loadTitleRushRow);

  return {
    enabled: row?.value?.enabled !== false,
    configured: Boolean(row),
    updated_at: row?.updated_at || null,
  };
}

export const getTitleRushEventStatus = unstable_cache(
  readTitleRushEventStatus,
  ["title-rush-event-status-v1"],
  {
    revalidate: TITLE_RUSH_EVENT_STATUS_TTL,
    tags: [TITLE_RUSH_EVENT_STATUS_TAG],
  },
);

export async function setTitleRushEventStatus(enabled: boolean) {
  const data = await setAppSetting(TITLE_RUSH_SETTING_KEY, { enabled });

  invalidateLocalSetting(TITLE_RUSH_LOCAL_KEY);
  revalidateTag(TITLE_RUSH_EVENT_STATUS_TAG, { expire: 0 });

  const row = data as TitleRushSettingRow;

  return {
    enabled: row?.value?.enabled !== false,
    configured: true,
    updated_at: row?.updated_at || null,
  };
}
