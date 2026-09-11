# Ryukomik image guard

Cloudflare Worker for protected Project chapter images. Signed `v2` cookies are scoped to one R2 chapter path, preventing a reader authorized for one chapter from opening another locked chapter.

Deploy this Worker together with the frontend change that issues `v2` image-session cookies:

```powershell
npx wrangler deploy
```
