export const CONTENT_API_URL = "https://api.ryukomik.web.id";
export const CONTENT_API_V2_URL = "https://apiv2.ryukomik.web.id";

type ContentFetchOptions = {
  revalidate: number;
  tags?: string[];
  timeoutMs?: number;
};

export async function fetchContentJson<T>(
  url: string,
  {
    revalidate,
    tags,
    timeoutMs = 12_000,
  }: ContentFetchOptions,
): Promise<T> {
  const next: { revalidate: number; tags?: string[] } = { revalidate };
  if (tags?.length) next.tags = tags;

  const response = await fetch(url, {
    next,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Content API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
