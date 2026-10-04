# Project chapter premium locks

This directory versions the previously VPS-only Project API. It uses the private Project PostgreSQL database, not Supabase.

`npm ci && npm run build` builds `dist/server.js`. Start with the existing Project environment and `PROJECT_API_PORT=4101` for a replacement service; keep the old service on 4100 for rollback.

Apply `database/premium-lock.sql` after a database backup. The provided `scripts/apply-premium-lock.mjs` requires an explicit `PREMIUM_LOCK_BACKUP` path, creates a pg_dump, and applies the additive schema. It clears legacy login locks and never converts them into premium locks.

The chapter-content and lock-metadata endpoints require the internal token. Chapter publishing is free by default. `/admin/chapter-lock` atomically validates 1–100 IDs, changes only lock timestamps, and records actor/before/after audit entries. The frontend determines actor and admin permission; this backend is loopback-only and fails closed if the internal token is absent.

Deploy the frontend and image worker before allowing admin lock actions. The frontend checks the worker's `premiumLockProtection` capability before saving. For rollback, unlock active premium locks first; older application/worker versions do not understand premium grants.
