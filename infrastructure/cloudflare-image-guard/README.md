# Ryukomik image guard

Cloudflare Worker for protected Project chapter images. Signed `v3` cookies bind the chapter path, grant (`public`, `premium`, or protected `preview`), expiry, and lock version. The worker checks current lock metadata before reading R2, even if anti-hotlink is disabled. Legacy `v2` cookies work only on unlocked chapters.

Deploy after the frontend internal chapter-access endpoint and Project Database migration are healthy. The worker uses its existing `IMAGE_ACCESS_SECRET` to authenticate metadata requests; no user profile is fetched per image. Lock metadata is cached at most 15 seconds; all chapter image responses are private/no-store.

Run `node --test test/*.test.js` before deployment:

```powershell
npx wrangler deploy
```
