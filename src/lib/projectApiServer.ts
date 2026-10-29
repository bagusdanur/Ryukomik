export function projectApiUrl(path: string): string | null {
  const base = process.env.PROJECT_API_URL?.replace(/\/$/, "");
  return base ? `${base}${path}` : null;
}

/**
 * Fallback baca project dari Supabase SUDAH DIMATIKAN permanen.
 *
 * Katalog project sekarang hanya dari Project API (127.0.0.1:4101). Kode
 * fallback lama dibiarkan sebagai referensi tapi tidak pernah dijalankan,
 * supaya tidak ada jalur baca Supabase yang hidup tanpa sengaja.
 */
export function allowSupabaseProjectReadFallback(): boolean {
  return false;
}

export class ProjectApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ProjectApiError'; }
}

export async function projectApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = projectApiUrl(path);
  if (!url) throw new Error("PROJECT_API_URL is not configured");
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (process.env.PROJECT_API_INTERNAL_TOKEN) headers.set("Authorization", `Bearer ${process.env.PROJECT_API_INTERNAL_TOKEN}`);
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new ProjectApiError(payload?.error || `Project API failed with status ${response.status}`, response.status);
  }
  return response.json() as Promise<T>;
}
