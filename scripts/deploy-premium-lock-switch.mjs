// Run on the VPS as ryukomik. Only switches this site's already-verified release.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const phase = process.argv[2];
if (!['prepare-worker', 'switch', 'switch-final'].includes(phase)) throw new Error('Expected prepare-worker, switch or switch-final.');
const resolved = execFileSync('readlink', ['-f', '/etc/nginx/sites-enabled/ryukomik'], { encoding: 'utf8' }).trim();
if (!['/etc/nginx/sites-available/ryukomik', '/etc/nginx/sites-enabled/ryukomik'].includes(resolved)) throw new Error('Unexpected Nginx target; stopping.');
const config = resolved;
const health = await fetch(`http://127.0.0.1:${phase === 'switch-final' ? 3003 : 3002}/`, { signal: AbortSignal.timeout(10_000) });
if (health.status !== 200) throw new Error('Replacement frontend not healthy.');
let content = execFileSync('sudo', ['-n', 'cat', config], { encoding: 'utf8' });
const marker = '# premium-lock metadata route';
if (phase === 'prepare-worker') {
  if (content.includes(marker)) throw new Error('Metadata route is already prepared.');
  const anchor = '    server_name ryukomik.my.id;';
  if (content.split(anchor).length !== 2) throw new Error('Unexpected primary virtual host.');
  content = content.replace(anchor, anchor + `

    ${marker}
    location = /api/internal/chapter-access {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache off;
    }
`);
} else if (phase === 'switch') {
  if (!content.includes(marker) || content.split('proxy_pass http://127.0.0.1:3000;').length !== 2) throw new Error('Unexpected upstream configuration.');
  content = content.replace('proxy_pass http://127.0.0.1:3000;', 'proxy_pass http://127.0.0.1:3002;');
} else {
  if (!content.includes(marker) || content.split('proxy_pass http://127.0.0.1:3002;').length !== 3) throw new Error('Unexpected upstream configuration.');
  content = content.replaceAll('proxy_pass http://127.0.0.1:3002;', 'proxy_pass http://127.0.0.1:3003;');
}
const backup = '/etc/nginx/ryukomik.pre-premium-lock-' + phase + '-20261004';
if (existsSync(backup)) throw new Error('Backup already exists; inspect before retrying.');
execFileSync('sudo', ['-n', 'cp', config, backup]);
const temp = join(mkdtempSync('/tmp/ryukomik-premium-lock-nginx-'), 'site.conf');
writeFileSync(temp, content, { mode: 0o600 });
try {
  execFileSync('sudo', ['-n', 'cp', temp, config]);
  execFileSync('sudo', ['-n', 'nginx', '-t'], { stdio: 'inherit' });
  execFileSync('sudo', ['-n', 'systemctl', 'reload', 'nginx']);
  console.log('Nginx phase complete:', phase, 'backup:', backup);
} catch (error) {
  execFileSync('sudo', ['-n', 'cp', backup, config]);
  execFileSync('sudo', ['-n', 'nginx', '-t'], { stdio: 'inherit' });
  execFileSync('sudo', ['-n', 'systemctl', 'reload', 'nginx']);
  throw error;
}
