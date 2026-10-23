/**
 * Pure rules for authenticated mutations.
 *
 * SECURITY INVARIANT: the acting user is ALWAYS the verified token subject.
 * Request bodies are attacker-controlled, so a body `user_id` must never grant
 * an identity — that is how comment/reaction impersonation worked before.
 */

/** Resolve the acting user from the verified token subject only. */
export function resolveActorUserId(tokenUserId: string | null | undefined): string | null {
  return tokenUserId ? tokenUserId : null;
}

const DEFAULT_PREMIUM_DAYS = 30;
const MAX_PREMIUM_DAYS = 3650;

/** Clamp admin-supplied premium days into a sane range. */
export function normalizePremiumDays(days: unknown): number {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PREMIUM_DAYS;
  return Math.min(n, MAX_PREMIUM_DAYS);
}

/**
 * Compute the new premium expiry. An active subscription is extended (stacked);
 * an expired or missing one starts from `now`.
 */
export function computePremiumUntil(
  currentUntil: string | null | undefined,
  days: number,
  now: number = Date.now(),
): string {
  const current = currentUntil ? Date.parse(currentUntil) : NaN;
  const base = Number.isFinite(current) && current > now ? current : now;
  return new Date(base + normalizePremiumDays(days) * 86_400_000).toISOString();
}

/**
 * Admin authorisation.
 *
 * `profiles.role` is attacker-writable while the table's RLS is permissive, so
 * a self-promoted `role='admin'` row must not be sufficient on its own. When an
 * allowlist is configured, admin rights additionally require the user id to be
 * listed. `null` means "no allowlist configured" (previous behaviour).
 */
export function parseAdminAllowlist(raw: string | undefined | null): Set<string> | null {
  const ids = String(raw || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return ids.length ? new Set(ids) : null;
}

export function isAdminAllowed(
  role: string | null | undefined,
  userId: string,
  allowlist: Set<string> | null,
): boolean {
  if (role !== "admin") return false;
  if (!allowlist) return true;
  return allowlist.has(userId);
}
