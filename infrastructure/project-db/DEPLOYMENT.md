# Premium lock release — 2026-10-04

The release is staged in `/home/ryukomik/releases/ryukomik-premium-lock-20261004`.

- Frontend: PM2 `ryukomik-premium-lock-final`, loopback port 3003, `NEXT_DIST_DIR=.next-final`.
- Project API: PM2 `ryukomik-project-db-premium-lock`, loopback port 4101; environment loaded from the existing private Project DB directory.
- Nginx primary host: `ryukomik.my.id`; reload, not stop/start.
- Worker: `ryukomik-image-guard`; v3 cookies and live lock metadata. Existing v2 cookies remain usable on free chapters.
- Service worker: cache v30. Project images/readers are never served from its cache.

Old frontend/backend processes stay online on ports 3000/4100 as rollback services. Old static chunks were copied into the new build so already-open tabs can continue loading assets.

Database backup: `/home/ryukomik/backups/premium-lock-before-20261004.dump` (owner-only). The schema adds two timestamps and retires login locks; it does not paywall existing chapters.

Nginx backups: `/etc/nginx/ryukomik.pre-premium-lock-prepare-worker-20261004`, `/etc/nginx/ryukomik.pre-premium-lock-switch-20261004`, and `/etc/nginx/ryukomik.pre-premium-lock-switch-final-20261004`. Unlock premium chapters before returning to old application/worker versions. Restore the first configuration for a complete traffic rollback; run `nginx -t` and reload.

Checks: local unit/API/worker security tests, type-check, frontend/backend build, private PostgreSQL transaction integration, and VPS/public smoke tests. Full-repository lint also checks unrelated worktrees and reports pre-existing errors; changed frontend files pass with only existing image warnings. Browser visual QA could not run because the browser connection failed at sandbox setup.

`scripts/monitor-premium-lock.mjs` records site/backend health, worker capability and recent access-error counts every 30 minutes for 48 hours. Its PM2 process must use `autorestart=false`; output is `/home/ryukomik/ryukomik/data/premium-lock-monitor-20261004.jsonl`. These checks do not measure Supabase request counts or Log Ingestion; compare those separately in Supabase Usage after 24–48 hours.
