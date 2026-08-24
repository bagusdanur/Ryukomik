export function projectApiUrl(path: string): string | null {
  const base = process.env.PROJECT_API_URL?.replace(/\/$/, "");
  return base ? `${base}${path}` : null;
}

export function allowSupabaseProjectReadFallback(): boolean {
  const configured = process.env.PROJECT_SUPABASE_READ_FALLBACK;
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV !== "production";
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
    throw new Error(payload?.error || `Project API failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}
