export type ChapterLock = { premium_lock_started_at?: string | null; premium_lock_until?: string | null };
export type PremiumAccessProfile = { is_premium?: boolean | null; premium_until?: string | null };

export function activePremium(profile: PremiumAccessProfile | null, now = Date.now()) {
  return Boolean(profile?.is_premium && (!profile.premium_until || new Date(profile.premium_until).getTime() > now));
}

export function evaluateChapterAccess(lock: ChapterLock, profile: PremiumAccessProfile | null, now = Date.now()) {
  const until = lock.premium_lock_until ? Date.parse(lock.premium_lock_until) : 0;
  const started = lock.premium_lock_started_at ? Date.parse(lock.premium_lock_started_at) : 0;
  if ((lock.premium_lock_until && !Number.isFinite(until)) || (until > now && (!started || !Number.isFinite(started)))) throw new Error('Metadata lock chapter tidak valid.');
  const locked = until > now;
  const allowed = !locked || activePremium(profile, now);
  const premiumUntil = profile?.premium_until ? Date.parse(profile.premium_until) : Infinity;
  const expires = Math.floor(Math.min(now + 2 * 60 * 60 * 1000, locked ? until : Infinity, locked ? premiumUntil : Infinity) / 1000);
  return { locked, allowed, lockUntil: lock.premium_lock_until || null, lockVersion: locked ? String(started) : '0', grant: locked ? 'premium' as const : 'public' as const, expires };
}

export function parseProjectImageScope(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname !== 'storage.ryukomik.my.id') return null;
    const match = decodeURIComponent(url.pathname).match(/^\/chapters\/([a-z0-9][a-z0-9-]*)\/(\d+(?:\.\d+)?)\//i);
    return match ? { slug: match[1].toLowerCase(), chapter: match[2], scope: `/chapters/${match[1].toLowerCase()}/${match[2]}/` } : null;
  } catch { return null; }
}
