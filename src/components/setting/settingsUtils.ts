export const XP_PER_LEVEL = 100;
export const AUTO_SYNC_KEY = "rk_auto_sync_backup_enabled";
export const LAST_AUTO_BACKUP_KEY = "rk_last_auto_backup_at";

export const getUserAutoSyncKey = (userId: string) => `${AUTO_SYNC_KEY}:${userId}`;
export const getUserLastBackupKey = (userId: string) => `${LAST_AUTO_BACKUP_KEY}:${userId}`;

export async function clearCoreCache() {
  if (!("caches" in window)) return false;

  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  return keys.length > 0;
}

async function clearIndexedDb() {
  if (!("indexedDB" in window)) return false;

  const dbFactory = indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string }>>;
  };

  if (!dbFactory.databases) return false;

  const databases = await dbFactory.databases();
  const names = databases.map((db) => db.name).filter(Boolean) as string[];

  await Promise.all(
    names.map(
      (name) =>
        new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        }),
    ),
  );

  return names.length > 0;
}

export async function unregisterServiceWorker() {
  let changed = false;

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    changed = registrations.length > 0;
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    changed = changed || keys.length > 0;
  }

  try {
    localStorage.clear();
    sessionStorage.clear();
    changed = true;
  } catch {
    // Browser private mode/storage restrictions: lanjutkan cleanup lain.
  }

  changed = (await clearIndexedDb()) || changed;

  return changed;
}

export function formatDate(date: string | number | Date) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | number | Date) {
  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPremiumDaysLeft(value?: string | number | Date | null) {
  if (!value) return "Aktif";

  const expiresAt = new Date(value).getTime();
  const remaining = expiresAt - Date.now();

  if (Number.isNaN(expiresAt) || remaining <= 0) return "Expired";

  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  return `${days} hari lagi`;
}

export function formatAutoSyncStatus(enabled: boolean, lastAutoBackup?: string | number | Date | null) {
  if (!enabled) return "Otomatis setiap 6 jam saat ON";
  if (!lastAutoBackup) return "ON - menunggu sync pertama";
  return `ON - terakhir ${formatDateTime(lastAutoBackup)}`;
}
