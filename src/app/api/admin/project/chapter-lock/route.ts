import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { verifyAdminRequest } from '@/lib/adminApi';
import { projectApiFetch, ProjectApiError } from '@/lib/projectApiServer';
import { invalidateChapterAccess } from '@/lib/chapterAccess';

const CONTROL_URL = 'https://storage.ryukomik.my.id/__ryukomik/image-guard';
type Changed = { id: string; manga_slug: string; chapter_number: string | number; premium_lock_started_at: string | null; premium_lock_until: string | null };
export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ('error' in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
    const body = await request.json().catch(() => null);
    const ids = body?.chapter_ids;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!Array.isArray(ids) || !ids.length || ids.length > 100 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !uuid.test(id))) return NextResponse.json({ error: 'Pilih 1–100 chapter dengan ID unik yang valid.' }, { status: 400 });
    if (!['lock', 'unlock'].includes(body.action) || (body.action === 'lock' && (!Number.isInteger(body.duration_days) || body.duration_days < 1 || body.duration_days > 365))) return NextResponse.json({ error: 'Aksi atau durasi lock tidak valid.' }, { status: 400 });
    const secret = process.env.IMAGE_ACCESS_SECRET;
    if (!secret) throw new Error('Proteksi gambar belum siap.');
    const headers = { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
    const guard = await fetch(CONTROL_URL, { cache: 'no-store', headers, signal: AbortSignal.timeout(10_000) });
    if (!guard.ok || !(await guard.json()).premiumLockProtection) return NextResponse.json({ error: 'Proteksi premium gambar belum aktif. Lock belum disimpan.' }, { status: 503 });
    const result = await projectApiFetch<{ data: Changed[] }>('/admin/chapter-lock', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chapter_ids: ids, action: body.action, duration_days: body.duration_days, actor_id: admin.userId }) });
    for (const item of result.data) {
      invalidateChapterAccess(item.manga_slug, item.chapter_number);
      revalidateTag(`project-detail:${item.manga_slug}`, { expire: 0 });
      revalidateTag(`project-chapter:${item.manga_slug}:chapter-${item.chapter_number}`, { expire: 0 });
      revalidatePath(`/komik/project/${item.manga_slug}`, 'page');
      revalidatePath(`/chapter/project/${item.manga_slug}/chapter-${item.chapter_number}`, 'page');
    }
    // Other edge isolates expire their metadata within 15 seconds.
    await fetch(CONTROL_URL, { method: 'POST', cache: 'no-store', headers, body: JSON.stringify({ scopes: result.data.map(item => `/chapters/${item.manga_slug}/${item.chapter_number}/`) }), signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof ProjectApiError && [400, 404].includes(error.status)) return NextResponse.json({ error: error.message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    console.error('Chapter lock failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Gagal menyimpan lock. Muat ulang daftar untuk memeriksa status.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
