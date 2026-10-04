import { NextResponse } from 'next/server';
import { projectApiFetch } from '@/lib/projectApiServer';
import { bearerToken, getChapterAccess } from '@/lib/chapterAccess';
import type { ChapterLock } from '@/lib/chapterAccessPolicy';
export const dynamic = 'force-dynamic';

type ChapterData = ChapterLock & { chapter_number: string | number; title?: string; image_urls?: string[]; prev?: string | null; next?: string | null };
export async function GET(request: Request, props: { params: Promise<{ slug: string; chapter: string }> }) {
  const { slug, chapter } = await props.params;
  const match = chapter.match(/^(?:chapter-)?(\d+(?:\.\d+)?)$/i);
  if (!slug || !match) return NextResponse.json({ success: false, error: 'Chapter tidak valid' }, { status: 400 });
  try {
    const payload = await projectApiFetch<{ data?: ChapterData }>(`/projects/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(match[1])}`, { cache: 'no-store' });
    if (!payload.data || !Object.hasOwn(payload.data, 'premium_lock_until')) throw new Error('Metadata akses chapter tidak tersedia.');
    const data = payload.data;
    const access = await getChapterAccess(slug, match[1], bearerToken(request), request.headers.get('x-refresh-premium') === 'true', data);
    return NextResponse.json({
      success: true, title: data.title || `Chapter ${data.chapter_number}`, currentChapter: `Chapter ${data.chapter_number}`,
      mangaId: slug, series: { slug }, prev: data.prev || null, next: data.next || null,
      locked: !access.allowed, lockUntil: access.lockUntil, accessRequirement: access.locked ? 'premium' : null,
      images: access.allowed ? data.image_urls || [] : [],
    }, { headers: { 'Cache-Control': 'private, no-store, max-age=0', 'CDN-Cache-Control': 'no-store', Vary: 'Authorization' } });
  } catch (error) {
    const missing = error instanceof Error && /Chapter not found|404/.test(error.message);
    return NextResponse.json({ success: false, error: missing ? 'Chapter tidak ditemukan.' : 'Layanan akses chapter belum tersedia. Coba kembali.' }, { status: missing ? 404 : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
