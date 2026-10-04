import { NextRequest, NextResponse } from 'next/server';
import { resolveProxyImageUrl } from '@/lib/imageProxyPolicy';
import { fetchProxyImage, ImageProxyBlockedError } from '@/lib/imageProxyFetch';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const target = new URL(request.url).searchParams.get('url');
  if (!target) return new NextResponse('Missing url parameter', {status:400});
  const url = resolveProxyImageUrl(target);
  if (!url) return new NextResponse('Image host is not allowed', {status:403,headers:{'Cache-Control':'no-store'}});
  try {
    const response = await fetchProxyImage(url);
    if (response.status < 200 || response.status >= 300) {
      return new NextResponse(`Failed to fetch image: HTTP ${response.status}`, {status:response.status,headers:{'Cache-Control':'no-store'}});
    }
    const expected = Number(response.headers['content-length'] || 0);
    if ((expected > 0 && response.body.length < expected) || response.body.length < 1024) {
      return new NextResponse('Incomplete or invalid image response from origin', {status:502,headers:{'Cache-Control':'no-store'}});
    }
    return new NextResponse(new Uint8Array(response.body), {headers:{
      'Content-Type':response.headers['content-type'],
      'Content-Length':String(response.body.length),
      'X-Content-Type-Options':'nosniff',
      'Cache-Control':'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
    }});
  } catch (error) {
    if (error instanceof ImageProxyBlockedError) return new NextResponse(error.message, {status:403,headers:{'Cache-Control':'no-store'}});
    console.error(`Image proxy ${url.hostname}: ${(error as Error).message}`);
    return new NextResponse('Error fetching image', {status:502,headers:{'Cache-Control':'no-store'}});
  }
}
