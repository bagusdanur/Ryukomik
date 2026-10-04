// Shared by URL selection in the browser and the server proxy route.
const EXACT_IMAGE_HOSTS = new Set([
  'pic.desu.xxx', 'doujin.desu.xxx', 'doujindesu.tv', 'doujindesu.com',
  'sektedoujin.com', 'sektedoujin.cc', 'kiryuu.org', 'kiryuu.to',
  // Verified image responses from current reader URLs on 2026-10-03.
  'cdn.komikindo.info', 'cdnasu.xyz', 'cdn.uqni.net', 'cdnkomikindo.xyz',
  'wibulep.xyz', 'cdnime.xyz', 'cdn.doujindesu.dev', 'cdnfgo.xyz',
]);
const IMAGE_HOST_FAMILIES = [
  'desu.pics', 'desu.photos', 'doujindesu.tv', 'doujindesu.com',
  'sektedoujin.com', 'kiryuu.org', 'kiryuu.to',
];
const SEKTE_CDN_HOSTS = new Set([
  'cdn.komikindo.info', 'cdnasu.xyz', 'cdn.uqni.net', 'cdnkomikindo.xyz',
  'wibulep.xyz', 'cdnime.xyz', 'cdnfgo.xyz',
]);

export function isHostnameOrSubdomain(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function isAllowedImageHostname(value: string) {
  const host = value.toLowerCase().replace(/\.$/, '');
  return EXACT_IMAGE_HOSTS.has(host) || IMAGE_HOST_FAMILIES.some(domain => isHostnameOrSubdomain(host, domain));
}

export function parseProxyImageUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      isAllowedImageHostname(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

export function getImageProxyReferer(url: URL) {
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (isHostnameOrSubdomain(host, 'kiryuu.org') || isHostnameOrSubdomain(host, 'kiryuu.to')) return 'https://kiryuu.org/';
  if (host === 'sektedoujin.cc' || isHostnameOrSubdomain(host, 'sektedoujin.com') || SEKTE_CDN_HOSTS.has(host)) return 'https://sektedoujin.cc/';
  if (host === 'pic.desu.xxx' || host === 'doujin.desu.xxx' || host === 'cdn.doujindesu.dev' ||
      ['desu.pics', 'desu.photos', 'doujindesu.tv', 'doujindesu.com'].some(domain => isHostnameOrSubdomain(host, domain))) return 'https://doujin.desu.xxx/';
  return url.origin;
}

export function resolveProxyImageUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    // Upgrade known legacy HTTP image links; transport always remains HTTPS.
    if (url.protocol === 'http:' && !url.port && !url.username && !url.password && isAllowedImageHostname(url.hostname)) url.protocol = 'https:';
    return parseProxyImageUrl(url.href);
  } catch {
    return null;
  }
}
