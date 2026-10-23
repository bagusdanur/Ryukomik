/**
 * Supabase calls go through undici, which keeps HTTP/2 sockets alive. When a
 * socket goes stale without a close notification, a request can hang until
 * undici's 300s headersTimeout. That is what turned admin endpoints into
 * infinite spinners (nginx logged 499/504 while the server was still waiting).
 *
 * We cap every Supabase call with a short timeout and retry once on a fresh
 * connection. Retries are limited to IDEMPOTENT methods: a timed-out POST may
 * already have been applied server-side, so retrying it could duplicate a write.
 */

export const SUPABASE_TIMEOUT_MS = 15_000;

export function shouldRetryFetch(method: string | undefined | null): boolean {
  const normalized = String(method || "GET").toUpperCase();
  return normalized === "GET" || normalized === "HEAD";
}

export function resolveRequestMethod(
  input: RequestInfo | URL,
  init?: RequestInit,
): string {
  if (init?.method) return String(init.method).toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) {
    return String(input.method || "GET").toUpperCase();
  }
  return "GET";
}

function buildSignal(timeoutMs: number, external?: AbortSignal | null): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!external) return timeout;
  const anyFn = (AbortSignal as unknown as { any?: (signals: AbortSignal[]) => AbortSignal }).any;
  return typeof anyFn === "function" ? anyFn([external, timeout]) : timeout;
}

export function createResilientFetch(
  baseFetch: typeof fetch = fetch,
  timeoutMs: number = SUPABASE_TIMEOUT_MS,
): typeof fetch {
  return async function resilientFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const method = resolveRequestMethod(input, init);
    const run = () =>
      baseFetch(input, { ...init, signal: buildSignal(timeoutMs, init?.signal) });

    try {
      return await run();
    } catch (error) {
      if (!shouldRetryFetch(method)) throw error;
      // A second attempt opens a fresh connection and normally succeeds.
      return run();
    }
  };
}
