import type { Dict } from "@/types/common";

const PROJECT_API_URL = process.env.PROJECT_API_URL?.replace(/\/$/, "");

export function hasProjectApi() {
  return Boolean(PROJECT_API_URL);
}

export async function fetchProjectApi<T extends Dict>(path: string, init?: RequestInit): Promise<T> {
  if (!PROJECT_API_URL) throw new Error("PROJECT_API_URL is not configured");
  const response = await fetch(`${PROJECT_API_URL}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers || {}) },
  });
  if (!response.ok) throw new Error(`Project API failed with status ${response.status}`);
  return response.json() as Promise<T>;
}
