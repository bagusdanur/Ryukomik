/**
 * Progres unduhan RAW.
 *
 * Disimpan di memori proses (bukan database): umurnya hanya selama satu unduhan
 * berjalan, dan tiap entri dibersihkan otomatis setelah 10 menit.
 */
export type RawStage = "fetch" | "convert" | "zip" | "done" | "error";

export type RawProgress = {
  stage: RawStage;
  done: number;
  total: number;
  message?: string;
  at: number;
};

const store = new Map<string, RawProgress>();
const TTL_MS = 10 * 60 * 1000;

function sweep() {
  const now = Date.now();
  for (const [key, value] of store) {
    if (now - value.at > TTL_MS) store.delete(key);
  }
}

export function setProgress(id: string | null | undefined, progress: Omit<RawProgress, "at">) {
  if (!id) return;
  sweep();
  store.set(id, { ...progress, at: Date.now() });
}

export function getProgress(id: string): RawProgress | null {
  return store.get(id) || null;
}

export function clearProgress(id: string | null | undefined) {
  if (id) store.delete(id);
}
