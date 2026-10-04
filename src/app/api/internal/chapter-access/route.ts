import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getChapterLock } from '@/lib/chapterAccess';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const expected = `Bearer ${process.env.IMAGE_ACCESS_SECRET || ''}`, received = request.headers.get('authorization') || '';
  if (!process.env.IMAGE_ACCESS_SECRET || received.length !== expected.length || !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) return new NextResponse('Unauthorized', { status: 401 });
  const scope = new URL(request.url).searchParams.get('scope') || '';
  const match = scope.match(/^\/chapters\/([a-z0-9][a-z0-9-]*)\/(\d+(?:\.\d+)?)\/$/i);
  if (!match) return NextResponse.json({ error: 'Scope invalid' }, { status: 400 });
  try { return NextResponse.json(await getChapterLock(match[1], match[2], true), { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch { return NextResponse.json({ error: 'Chapter access unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
