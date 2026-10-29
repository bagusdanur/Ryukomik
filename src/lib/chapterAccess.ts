import 'server-only';
import { unstable_cache, revalidateTag } from 'next/cache';
import { getVerifiedUserId } from '@/lib/serverRoleCache';
import { socialQuery } from '@/lib/social/db';
import { projectApiFetch } from '@/lib/projectApiServer';
import { evaluateChapterAccess, type ChapterLock, type PremiumAccessProfile } from './chapterAccessPolicy';

const locks = new Map<string, { at: number; data: ChapterLock }>();
const pending = new Map<string, Promise<ChapterLock>>();
const forcedAt = new Map<string, number>();
const premiumRequests = new Map<string, Promise<PremiumAccessProfile | null>>();
export function invalidateChapterAccess(slug: string, chapter: string | number) { const key = `${slug}/${chapter}`; locks.delete(key); pending.delete(key); }
export function invalidatePremiumAccess(userId: string) { premiumRequests.delete(userId); revalidateTag(`premium-access:${userId}`, { expire: 0 }); }

export async function getChapterLock(slug: string, chapter: string | number, fresh = false): Promise<ChapterLock> {
  if (fresh) {
    const result = await projectApiFetch<{ data: ChapterLock }>(`/internal/chapter-access/${encodeURIComponent(slug)}/${encodeURIComponent(String(chapter))}`, { cache: 'no-store' });
    if (!result.data || !Object.hasOwn(result.data, 'premium_lock_until')) throw new Error('Metadata akses chapter tidak tersedia.');
    evaluateChapterAccess(result.data, null);
    return result.data;
  }
  const key = `${slug}/${chapter}`, cached = locks.get(key);
  if (cached && Date.now() - cached.at < 15_000) return cached.data;
  if (pending.has(key)) return pending.get(key)!;
  const request = projectApiFetch<{ data: ChapterLock }>(`/internal/chapter-access/${encodeURIComponent(slug)}/${encodeURIComponent(String(chapter))}`, { cache: 'no-store' }).then(result => {
    if (!result.data || !Object.hasOwn(result.data, 'premium_lock_until')) throw new Error('Metadata akses chapter tidak tersedia.');
    evaluateChapterAccess(result.data, null);
    if (locks.size > 1000) locks.clear();
    if (pending.get(key) === request) locks.set(key, { at: Date.now(), data: result.data });
    return result.data;
  }).finally(() => { if (pending.get(key) === request) pending.delete(key); });
  pending.set(key, request);
  return request;
}

export async function getPremiumAccess(token: string, force = false): Promise<PremiumAccessProfile | null> {
  if (!token) return null;
  let userId: string;
  try { userId = await getVerifiedUserId(token); } catch { return null; }
  if (force && Date.now() - (forcedAt.get(userId) || 0) > 10_000) {
    invalidatePremiumAccess(userId);
    if (forcedAt.size > 1000) forcedAt.clear();
    forcedAt.set(userId, Date.now());
  }
  if (premiumRequests.has(userId)) return premiumRequests.get(userId)!;
  // Entitlement premium = data LOKAL (social_profiles). Membaca tabel `profiles`
  // Supabase di sini membuat premium yang baru di-grant admin tidak terbaca
  // (chapter premium tetap terkunci) dan sebaliknya.
  const request = unstable_cache(async () => {
    const { rows } = await socialQuery<PremiumAccessProfile>(
      'select is_premium, premium_until from social_profiles where user_id = $1',
      [userId],
    );
    return rows[0] ?? null;
  }, ['premium-access-v2', userId], { revalidate: 60, tags: [`premium-access:${userId}`] })().finally(() => { if (premiumRequests.get(userId) === request) premiumRequests.delete(userId); });
  premiumRequests.set(userId, request);
  return request;
}

export async function getChapterAccess(slug: string, chapter: string | number, token: string, force = false, lock?: ChapterLock) {
  const metadata = lock || await getChapterLock(slug, chapter);
  const publicAccess = evaluateChapterAccess(metadata, null);
  return publicAccess.locked ? evaluateChapterAccess(metadata, await getPremiumAccess(token, force)) : publicAccess;
}

export function bearerToken(request: Request) { return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''; }
