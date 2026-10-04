import { appendFileSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true }); dotenv.config({ path: '.env', quiet: true });
const started = Date.now();
const duration = 48 * 60 * 60 * 1000;
const output = '/home/ryukomik/ryukomik/data/premium-lock-monitor-20261004.jsonl';
async function check() {
  const entry = { at: new Date().toISOString() };
  for (const [name, url] of [['site', 'https://ryukomik.my.id/'], ['backend', 'http://127.0.0.1:4101/health']]) {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(15_000) }); entry[name] = response.status; await response.body?.cancel(); }
    catch { entry[name] = 'unreachable'; }
  }
  try {
    const response = await fetch('https://storage.ryukomik.my.id/__ryukomik/image-guard', { headers: { authorization: `Bearer ${process.env.IMAGE_ACCESS_SECRET}` }, signal: AbortSignal.timeout(15_000) });
    entry.worker = response.ok && (await response.json()).premiumLockProtection === true;
  } catch { entry.worker = false; }
  try {
    const recent = readFileSync('/home/ryukomik/.pm2/logs/ryukomik-premium-lock-final-error.log', 'utf8').split('\n').slice(-200);
    entry.recentAccessErrorLines = recent.filter(line => /Chapter lock failed|Layanan akses|chapter access|image session|Image guard denied/i.test(line)).length;
  } catch { entry.recentAccessErrorLines = 0; }
  appendFileSync(output, JSON.stringify(entry) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(entry));
  if (Date.now() - started < duration) setTimeout(() => void check(), 30 * 60 * 1000);
}
await check();
