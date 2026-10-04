import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { getImageProxyReferer, parseProxyImageUrl } from './imageProxyPolicy';

export class ImageProxyBlockedError extends Error {}
const MAX_BYTES = 12 * 1024 * 1024;
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

export function isPublicImageAddress(address: string) {
  if (isIP(address) === 4) {
    const [a,b,c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
      (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) === 6) {
    const first = parseInt(address.split(':')[0],16);
    return first >= 0x2000 && first <= 0x3fff && !/^2001:0?db8:/i.test(address);
  }
  return false;
}

export async function fetchProxyImage(input: URL, deadline = Date.now() + 15000, redirects = 0): Promise<{ status: number; headers: Record<string,string>; body: Buffer }> {
  const url = parseProxyImageUrl(input.href);
  if (!url) throw new ImageProxyBlockedError('Image host is not allowed');
  let timer: ReturnType<typeof setTimeout>;
  const addresses = await Promise.race([
    lookup(url.hostname, {all: true}),
    new Promise<never>((_,reject) => { timer = setTimeout(() => reject(new Error('Image DNS timeout')), Math.max(1,deadline-Date.now())); }),
  ]).finally(() => clearTimeout(timer));
  const address = addresses.find(value => value.family === 4 && isPublicImageAddress(value.address)) || addresses.find(value => isPublicImageAddress(value.address));
  if (!address) throw new ImageProxyBlockedError('Image address is not public');
  if (Date.now() >= deadline) throw new Error('Image fetch timeout');
  const response = await new Promise<{status: number; headers: Record<string,string>; body: Buffer}>((resolve,reject) => {
    const req = httpsRequest({
      hostname: address.address, family: address.family, servername: url.hostname,
      port: 443, path: `${url.pathname}${url.search}`, method: 'GET',
      rejectUnauthorized: process.env.IMAGE_PROXY_STRICT_TLS === '1',
      headers: {Host: url.host, 'User-Agent': 'Mozilla/5.0',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Encoding': 'identity', Referer: getImageProxyReferer(url)},
    }, res => {
      const status = res.statusCode || 502;
      const headers = Object.fromEntries(Object.entries(res.headers).map(([k,v]) => [k,Array.isArray(v) ? v.join(',') : String(v ?? '')]));
      if (REDIRECT_CODES.has(status) || status < 200 || status >= 300) {
        res.destroy(); resolve({status,headers,body: Buffer.alloc(0)}); return;
      }
      if (!/^image\//i.test(headers['content-type'] || '')) {
        res.destroy(); reject(new Error('Origin response is not an image')); return;
      }
      if (Number(headers['content-length'] || 0) > MAX_BYTES) {
        res.destroy(); reject(new Error('Image too large')); return;
      }
      let size = 0;
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) { req.destroy(new Error('Image too large')); return; }
        chunks.push(chunk);
      });
      res.on('end', () => resolve({status,headers,body:Buffer.concat(chunks)}));
      res.on('aborted', () => reject(new Error('Incomplete image response from origin')));
      res.on('error', reject);
    });
    const timeout = setTimeout(() => req.destroy(new Error('Image fetch timeout')), Math.max(1,deadline-Date.now()));
    req.on('close', () => clearTimeout(timeout));
    req.on('error', reject);
    req.end();
  });
  if (REDIRECT_CODES.has(response.status)) {
    if (redirects >= 3 || !response.headers.location) throw new Error('Image redirect limit exceeded');
    return fetchProxyImage(new URL(response.headers.location,url), deadline, redirects+1);
  }
  return response;
}
