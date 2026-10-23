/**
 * Pure ban rules. `profiles.banned_until = null` + `is_banned = true` means a
 * permanent ban; a timestamp means temporary.
 */

export type BanState = {
  is_banned?: boolean | null;
  banned_until?: string | null;
};

export type BanEvaluation = {
  banned: boolean;
  permanent: boolean;
  expiresAt: string | null;
};

export function evaluateBan(state: BanState | null | undefined, now: number = Date.now()): BanEvaluation {
  if (!state?.is_banned) return { banned: false, permanent: false, expiresAt: null };

  const until = state.banned_until ? Date.parse(state.banned_until) : NaN;
  if (!Number.isFinite(until)) {
    // is_banned with no (valid) expiry = permanent.
    return { banned: true, permanent: true, expiresAt: null };
  }
  if (until <= now) return { banned: false, permanent: false, expiresAt: null };
  return { banned: true, permanent: false, expiresAt: new Date(until).toISOString() };
}

/** null / 0 / "permanent" => permanent (null). Otherwise clamp to 1..3650 days. */
export function normalizeBanDays(days: unknown): number | null {
  if (days === null || days === undefined || days === "permanent" || days === 0) return null;
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, 3650);
}

export function banUntilFrom(days: number | null, now: number = Date.now()): string | null {
  if (days === null) return null;
  return new Date(now + days * 86_400_000).toISOString();
}

/** Banned users cannot act, but an admin cannot lock themselves out. */
export function canBanTarget(actorUserId: string, targetUserId: string): boolean {
  return actorUserId !== targetUserId;
}
