import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type ImageAccessGrant = 'public' | 'premium' | 'preview';

export function signImageAccessCookie(scope: string, grant: ImageAccessGrant, lockVersion: string, expires: number) {
  const secret = process.env.IMAGE_ACCESS_SECRET;
  if (!secret || secret.length < 32) throw new Error('Layanan akses gambar belum siap.');
  const payload = `v3.${expires}.${randomBytes(12).toString('base64url')}.${Buffer.from(scope).toString('base64url')}.${grant}.${lockVersion}`;
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}

export function parseImageAccessCookie(
  cookieHeader: string | null,
  expectedScope: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): { expires: number; grant: ImageAccessGrant; lockVersion: string } | null {
  const secret = process.env.IMAGE_ACCESS_SECRET;
  if (!secret || secret.length < 32 || !cookieHeader) return null;
  const value = cookieHeader
    .split(/;\s*/)
    .find((part) => part.startsWith('ryu_image_access='))
    ?.slice('ryu_image_access='.length);
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 7 || parts[0] !== 'v3') return null;
  const [version, expiresText, , scopeBase64, grant, lockVersion, signature] = parts;
  if (version !== 'v3' || !/^\d+$/.test(expiresText) || !/^\d+$/.test(lockVersion)) return null;
  if (!['public', 'premium', 'preview'].includes(grant)) return null;
  const expires = Number(expiresText);
  if (!Number.isFinite(expires) || expires <= nowSeconds || expires > nowSeconds + 3 * 60 * 60) return null;
  let scope: string;
  try {
    scope = Buffer.from(scopeBase64, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (scope !== expectedScope) return null;
  const payload = parts.slice(0, -1).join('.');
  const expected = createHmac('sha256', secret).update(payload).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { expires, grant: grant as ImageAccessGrant, lockVersion };
}
