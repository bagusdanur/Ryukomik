import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';

export function signImageAccessCookie(scope: string, grant: 'public' | 'premium' | 'preview', lockVersion: string, expires: number) {
  const secret = process.env.IMAGE_ACCESS_SECRET;
  if (!secret || secret.length < 32) throw new Error('Layanan akses gambar belum siap.');
  const payload = `v3.${expires}.${randomBytes(12).toString('base64url')}.${Buffer.from(scope).toString('base64url')}.${grant}.${lockVersion}`;
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
