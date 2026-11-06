# Migrasi Total Keluar dari Supabase (Auth Lokal) — Implementation Plan

> **Untuk Hermes:** eksekusi pakai skill `subagent-driven-development`, satu subagent per task, review spec lalu review kualitas sebelum lanjut.

**Goal:** Menghapus seluruh ketergantungan Supabase — mengganti Supabase Auth (Google OAuth) dengan auth milik sendiri di Postgres lokal, tanpa mengubah `user_id` (UUID) yang sudah dipakai 10.6k profil, XP, komentar, maraton, bookmark, dan koleksi.

**Architecture:** Google OAuth (Authorization Code + PKCE) ditangani route Next.js sendiri; identitas dipetakan ke `auth_users.id` yang **memakai UUID lama** (`social_profiles.user_id`), lalu sesi dikelola JWT HS256 milik sendiri yang ditandatangani `AUTH_JWT_SECRET` + refresh token di tabel `auth_sessions`. Verifikasi token di server tetap lewat `src/lib/serverRoleCache.ts` (sudah mendukung HS256 lokal), jadi semua endpoint `/api/*` tidak berubah kontraknya.

**Tech Stack:** Next.js App Router, Postgres lokal (`SOCIAL_DATABASE_URL`), `node:crypto` (HMAC), Google OAuth 2.0 (Google Identity), cookie httpOnly, tanpa library auth tambahan.

---

## Current Context / Assumptions (hasil audit, bukan asumsi)

Ketergantungan Supabase yang tersisa:

| Area | Jumlah | Keterangan |
|---|---|---|
| `.from(...)` (PostgREST) | 0 | sudah pindah lokal |
| `.storage.` | 0 | gambar pakai R2 |
| Realtime/channel | 0 | tidak dipakai |
| `.rpc(...)` | 5 | semuanya cabang fallback project yang sudah mati (`allowSupabaseProjectReadFallback() === false`) |
| `auth.*` | 59 | 49× `getSession`, 4× `signOut`, 3× `auth.admin`, 1× `signInWithOAuth`, 1× `onAuthStateChange`, 1× `getUser`, 2× `getClaims` |

Fakta penting:
- **Satu-satunya metode login: Google** (`src/components/LoginModal.tsx:27`). Tidak ada password/OTP, jadi tidak ada hash password yang perlu dimigrasi.
- Client Supabase hanya satu instance: `src/lib/supabase/client.ts` (di-reexport `src/lib/supabaseClient.ts`), `autoRefreshToken: true`.
- Verifikasi token server-side **sudah lokal** sejak commit `3adb53a5` (`src/lib/serverRoleCache.ts` memakai `SUPABASE_JWT_SECRET` = secret JWT project Supabase).
- Session Supabase saat ini disimpan di localStorage (`sb-<ref>-auth-token`), bukan cookie.
- Tabel/kolom yang menyimpan identitas: `social_profiles.user_id` (PK), `comments.author_id`, `marathon_reads.user_id`, `user_reads.user_id`, `bookmark_sync.user_id`, `user_collections.user_id`, `notified_chapters`, `push_subscriptions`.
- Supabase dipakai juga oleh: `src/app/api/ban/lookup/route.ts` (`/auth/v1/admin/users?filter=`) dan `src/app/api/admin/users/route.ts` + `src/app/api/me/profile/route.ts` (`auth.admin.updateUserById` untuk ban/unban).

Batasan yang harus dipatuhi:
- **UUID tidak boleh berubah.** Semua relasi memakai `user_id` lama.
- Deploy wajib lewat staging build (`./scripts/deploy.sh`) + commit/push.
- Jangan pernah menampilkan secret di UI/log/chat.
- Tidak boleh ada emoji di UI; ikon pakai `react-icons`/`lucide-react` sesuai pola yang ada.
- Setiap tahap harus bisa di-rollback tanpa kehilangan sesi user lama.

---

## Proposed Approach (bertahap, dual-run)

1. **Fase A — Fondasi data & token** (tanpa menyentuh user): tabel `auth_users`, `auth_sessions`, `auth_oauth_states`; util JWT sendiri; verifikasi dual (token sendiri **atau** token Supabase lama).
2. **Fase B — Login Google sendiri**: route start/callback, upsert user berdasarkan `google_sub`/email lalu terbitkan token sendiri dengan `sub` = UUID lama.
3. **Fase C — Klien**: `AuthProvider` + `useAuth()` menggantikan 49 `getSession`, 4 `signOut`, 1 `onAuthStateChange`; `LoginModal` menembak route sendiri; `/auth/callback` lama dipertahankan sebagai jembatan.
4. **Fase D — Admin & ban**: ban/unban pindah ke `auth_users.banned_until` + hapus `auth_sessions`; `ban/lookup` baca DB lokal (bukan Auth admin).
5. **Fase E — Cutover**: matikan dual-verify, hapus `@supabase/supabase-js`, hapus 5 RPC + fallback mati, hapus env Supabase.
6. **Fase F — Verifikasi & bersih-bersih**: uji regresi penuh, ukur egress Supabase = 0, hapus project Supabase setelah 14 hari aman.

Setiap fase punya commit sendiri dan bisa berhenti tanpa merusak produksi.

---

## Files Likely to Change

**Baru**
- `database/auth/001_auth_local.sql`
- `src/lib/auth/jwt.ts`
- `src/lib/auth/session.ts`
- `src/lib/auth/google.ts`
- `src/lib/auth/userStore.ts`
- `src/app/api/auth/google/start/route.ts`
- `src/app/api/auth/google/callback/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/components/auth/AuthProvider.tsx`
- `src/hooks/useAuth.ts`
- `scripts/test-auth-local.mjs`

**Dimodifikasi**
- `src/lib/serverRoleCache.ts` (verifikasi dual → token sendiri)
- `src/lib/social/auth.ts` (tetap, tapi komentar & jalur token baru)
- `src/components/LoginModal.tsx` (Google via route sendiri)
- `src/app/auth/callback/page.tsx` (jembatan/redirect)
- `src/app/api/admin/users/route.ts` (ban/unban lokal)
- `src/app/api/me/profile/route.ts` (ban/unban lokal)
- `src/app/api/ban/lookup/route.ts` (lookup lokal)
- 49 komponen/klien yang memanggil `supabase.auth.getSession()` → `useAuth()`
- `src/lib/supabase/client.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabaseClient.ts`, `src/lib/supabaseServer.ts` (dihapus di Fase E)
- `src/app/api/project/view/[slug]/route.ts`, `src/app/api/project/pustaka/route.ts`, `src/app/api/source/project/pustaka/route.ts`, `src/app/api/source/project/search/route.ts` (hapus RPC mati)
- `package.json` (hapus `@supabase/supabase-js`)
- `.env.local` (tambah `AUTH_JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_BASE_URL`)

---

## Task List

### Task 1: Skema database auth lokal

**Objective:** Menyediakan tabel identitas & sesi tanpa menyentuh tabel sosial yang ada.

**Files:**
- Create: `database/auth/001_auth_local.sql`

**Step 1: Tulis migrasi**

```sql
create table if not exists auth_users (
  id uuid primary key,                       -- UUID lama dari Supabase (jangan generate baru)
  email text not null unique,
  google_sub text unique,
  full_name text,
  avatar_url text,
  banned_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  refresh_hash text not null,
  user_agent text,
  ip text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index if not exists idx_auth_sessions_user on auth_sessions(user_id) where revoked_at is null;

create table if not exists auth_oauth_states (
  state text primary key,
  code_verifier text not null,
  next_url text,
  created_at timestamptz not null default now()
);
```

**Step 2: Terapkan ke DB lokal**

Run: `psql "$SOCIAL_DATABASE_URL" -f database/auth/001_auth_local.sql`
Expected: `CREATE TABLE` ×3 tanpa error.

**Step 3: Backfill identitas dari `social_profiles`**

```sql
insert into auth_users (id, email, full_name, avatar_url)
select p.user_id,
       coalesce(nullif(p.email,''), p.user_id::text || '@placeholder.local'),
       p.display_name,
       p.avatar_url
from social_profiles p
on conflict (id) do nothing;
```

**Step 4: Verifikasi**

Run: `psql "$SOCIAL_DATABASE_URL" -c "select count(*) from auth_users;"`
Expected: ≥ 10.600 (jumlah profil).

**Step 5: Commit**

```bash
git add database/auth/001_auth_local.sql
git commit -m "feat(auth): skema auth lokal (users, sessions, oauth states)"
```

---

### Task 2: Util JWT milik sendiri

**Objective:** Menandatangani & memverifikasi token HS256 tanpa dependensi baru.

**Files:**
- Create: `src/lib/auth/jwt.ts`
- Test: `scripts/test-auth-local.mjs`

**Step 1: Tulis util**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export type AuthClaims = { sub: string; exp: number; iat: number; typ: "access" };

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function signAccessToken(userId: string, secret: string, ttlSeconds = 60 * 60 * 24 * 7): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ sub: userId, iat: now, exp: now + ttlSeconds, typ: "access" }));
  const sig = b64url(createHmac("sha256", secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

export function verifyAccessToken(token: string, secret: string): AuthClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = createHmac("sha256", secret).update(`${h}.${p}`).digest();
  const actual = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as AuthClaims;
    if (claims.typ !== "access" || claims.exp * 1000 <= Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}
```

**Step 2: Uji manual**

```bash
node --input-type=module -e '
import { signAccessToken, verifyAccessToken } from "./dist-test/auth/jwt.js";
const t = signAccessToken("11111111-1111-1111-1111-111111111111", "rahasia");
console.log(verifyAccessToken(t, "rahasia")?.sub, verifyAccessToken(t, "salah"));
'
```
Expected: UUID lalu `null`.

**Step 3: Commit**
```bash
git add src/lib/auth/jwt.ts
git commit -m "feat(auth): util JWT HS256 lokal"
```

---

### Task 3: Verifikasi dual di server (token sendiri ATAU Supabase lama)

**Objective:** Sesi lama tetap jalan selama migrasi; token baru langsung dikenali.

**Files:**
- Modify: `src/lib/serverRoleCache.ts:46-90`

**Step 1: Ubah `getVerifiedUserId`**

```ts
const ownSecret = process.env.AUTH_JWT_SECRET;
const claims = ownSecret ? verifyAccessToken(token, ownSecret) : null;
if (claims) { /* pakai claims.sub, exp */ }
else if (process.env.SUPABASE_JWT_SECRET) { /* jalur lama verifyLegacyJwt */ }
else { throw new Error("Sesi login tidak valid."); }
```

**Step 2: Uji**

- Token sendiri (dibuat Task 2) → `GET /api/me/profile` **200**
- Token Supabase asli (dari browser user login lama) → tetap **200**
- Token acak → **401**

**Step 3: Commit**
```bash
git add src/lib/serverRoleCache.ts
git commit -m "feat(auth): verifikasi dual token sendiri + token Supabase lama"
```

---

### Task 4: Alur Google OAuth sendiri — start

**Objective:** Membuat state+PKCE dan redirect ke Google.

**Files:**
- Create: `src/app/api/auth/google/start/route.ts`
- Create: `src/lib/auth/google.ts`

**Step 1: Implementasi**

```ts
// src/app/api/auth/google/start/route.ts
import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { socialQuery } from "@/lib/social/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  await socialQuery("insert into auth_oauth_states(state, code_verifier, next_url) values ($1,$2,$3)", [state, verifier, next]);

  const redirect = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  redirect.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  redirect.searchParams.set("redirect_uri", `${process.env.AUTH_BASE_URL}/api/auth/google/callback`);
  redirect.searchParams.set("response_type", "code");
  redirect.searchParams.set("scope", "openid email profile");
  redirect.searchParams.set("state", state);
  redirect.searchParams.set("code_challenge", challenge);
  redirect.searchParams.set("code_challenge_method", "S256");
  redirect.searchParams.set("prompt", "select_account");
  return NextResponse.redirect(redirect);
}
```

**Step 2: Uji**
Run: `curl -sI "https://<host>/api/auth/google/start?next=/" | grep -i location`
Expected: `302` ke `accounts.google.com` dengan `state` & `code_challenge`.

**Step 3: Commit**
```bash
git add src/app/api/auth/google/start/route.ts src/lib/auth/google.ts
git commit -m "feat(auth): mulai Google OAuth dengan PKCE"
```

---

### Task 5: Callback Google → sesi sendiri

**Objective:** Tukar `code` ke Google, petakan ke `auth_users` (UUID lama), terbitkan token + refresh cookie, catat sesi.

**Files:**
- Create: `src/app/api/auth/google/callback/route.ts`
- Create: `src/lib/auth/userStore.ts`
- Create: `src/lib/auth/session.ts`

**Step 1: Implementasi inti**

```ts
// potongan penting
const { code, state } = Object.fromEntries(new URL(request.url).searchParams);
const { rows: [stateRow] } = await socialQuery<{ code_verifier: string; next_url: string }>(
  "delete from auth_oauth_states where state=$1 returning code_verifier, next_url", [state]);
if (!stateRow) return NextResponse.redirect(`${base}/?login=error`);

const tokenRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({
  code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
  redirect_uri: `${base}/api/auth/google/callback`, grant_type: "authorization_code", code_verifier: stateRow.code_verifier,
}) });
const { id_token } = await tokenRes.json();
const info = JSON.parse(Buffer.from(id_token.split(".")[1], "base64").toString("utf8")); // sub, email, name, picture

const user = await upsertAuthUser({ googleSub: info.sub, email: info.email, name: info.name, avatar: info.picture });
if (user.banned_until && new Date(user.banned_until) > new Date()) {
  return NextResponse.redirect(`${base}/?login=banned`);
}
const { refreshToken, sessionId } = await createSession(user.id, request);
const access = signAccessToken(user.id, process.env.AUTH_JWT_SECRET!, 60 * 60 * 24 * 7);
const res = NextResponse.redirect(`${base}${stateRow.next_url || "/"}`);
res.cookies.set("rk_session", refreshToken, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
return res;
```

`upsertAuthUser` WAJIB memakai `id` lama:

```ts
// 1) cari by google_sub → 2) cari by email di auth_users → 3) cari profil sosial by email
// 4) kalau ketemu: simpan google_sub ke baris itu (id TIDAK berubah)
// 5) kalau benar-benar baru: id = gen_random_uuid() lalu buat social_profiles
```

**Step 2: Uji manual di browser**
- Login Google → balik ke beranda, `document.cookie` berisi `rk_session` (httpOnly, tidak terlihat di JS — cek via DevTools → Application → Cookies).
- `GET /api/auth/me` dengan kredensial cookie → `{ user: { id, email } }`.
- Pastikan `id` = UUID lama (bandingkan dengan `social_profiles`).

**Step 3: Commit**
```bash
git add src/app/api/auth/google/callback/route.ts src/lib/auth/session.ts src/lib/auth/userStore.ts
git commit -m "feat(auth): callback Google + sesi lokal (UUID lama dipertahankan)"
```

---

### Task 6: Endpoint `/api/auth/me` & `/api/auth/logout`

**Objective:** Klien punya satu sumber kebenaran sesi; logout mencabut sesi.

**Files:**
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/app/api/auth/logout/route.ts`

**Step 1:** `me` → baca cookie `rk_session`, validasi hash di `auth_sessions`, kembalikan `{ user: { id, email, name, avatar }, banned }`. `logout` → set `revoked_at`, hapus cookie.

**Step 2: Uji**

```bash
curl -s -b "rk_session=<nilai>" https://<host>/api/auth/me
curl -s -X POST -b "rk_session=<nilai>" https://<host>/api/auth/logout -o /dev/null -w '%{http_code}\n'
```
Expected: JSON user, lalu `200`, dan `me` berikutnya `401`.

**Step 3: Commit**
```bash
git add src/app/api/auth/me/route.ts src/app/api/auth/logout/route.ts
git commit -m "feat(auth): endpoint me & logout lokal"
```

---

### Task 7: `AuthProvider` + `useAuth()` di klien

**Objective:** Mengganti pola `supabase.auth.getSession()` tanpa mengubah UI.

**Files:**
- Create: `src/components/auth/AuthProvider.tsx`
- Create: `src/hooks/useAuth.ts`
- Modify: `src/app/layout.tsx` (bungkus provider)

**Step 1: Provider**

```tsx
"use client";
const AuthContext = createContext<{ user: AuthUser | null; loading: boolean; signOut: () => Promise<void>; refresh: () => Promise<void> }>(...);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
    setUser(res.ok ? (await res.json()).user : null);
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);
  return <AuthContext.Provider value={{ user, loading, signOut, refresh }}>{children}</AuthContext.Provider>;
}
```

**Step 2:** Ganti bertahap pola berikut (49 file):

```ts
// sebelum
const { data } = await supabase.auth.getSession();
const id = data.session?.user.id;

// sesudah
const { user } = useAuth();
const id = user?.id ?? null;
```
Untuk kode non-komponen (utils), pakai `await fetch("/api/auth/me")` atau fungsi `getViewer()` di `src/lib/auth/client.ts`.

**Step 3: Uji** — login, refresh halaman, buka `/files`, `/marathon`, `/setting`: tidak ada request ke `supabase.co` di tab Network.

**Step 4: Commit**
```bash
git add src/components/auth/AuthProvider.tsx src/hooks/useAuth.ts src/app/layout.tsx
git commit -m "feat(auth): AuthProvider + useAuth menggantikan getSession"
```

---

### Task 8: LoginModal & halaman `auth/callback`

**Objective:** Tombol Google menembak route sendiri; callback lama jadi jembatan.

**Files:**
- Modify: `src/components/LoginModal.tsx:26-33`
- Modify: `src/app/auth/callback/page.tsx`

**Step 1:** Ganti aksi tombol jadi:

```ts
const login = () => {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/api/auth/google/start?next=${next}`;
};
```

**Step 2:** `/auth/callback` lama: kalau tidak ada `code`/`error` Supabase, langsung `router.replace("/")` (jangan panggil `supabase.auth.getSession()`).

**Step 3: Uji** — klik "Google" di modal, alur penuh sampai kembali ke halaman asal.

**Step 4: Commit**
```bash
git add src/components/LoginModal.tsx src/app/auth/callback/page.tsx
git commit -m "feat(auth): login Google via route sendiri"
```

---

### Task 9: Ban/unban & lookup pindah ke DB lokal

**Objective:** Menghapus 3 pemanggilan `auth.admin` dan `/auth/v1/admin/users`.

**Files:**
- Modify: `src/app/api/admin/users/route.ts`
- Modify: `src/app/api/me/profile/route.ts` (jika masih memakai `updateUserById`)
- Modify: `src/app/api/ban/lookup/route.ts`

**Step 1:** ban → `update auth_users set banned_until = now() + interval '<n> hours' where id = $1` + `update auth_sessions set revoked_at = now() where user_id = $1`.

**Step 2:** lookup by email → `select id, email, banned_until from auth_users where lower(email) = lower($1)` (tidak ada lagi panggilan ke Auth admin).

**Step 3: Uji**
- Ban akun uji → `/api/me/profile` **403** `BANNED`, `/api/auth/me` mengembalikan `banned: true`.
- Unban → akses normal.
- `POST /api/ban/lookup` dengan email akun uji → sisa waktu benar.

**Step 4: Commit**
```bash
git add src/app/api/admin/users/route.ts src/app/api/me/profile/route.ts src/app/api/ban/lookup/route.ts
git commit -m "feat(auth): ban & lookup lokal, lepas Auth admin Supabase"
```

---

### Task 10: Cutover — hapus Supabase

**Objective:** Tidak ada lagi kode yang menyentuh Supabase.

**Files:**
- Delete: `src/lib/supabase/client.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabaseClient.ts`, `src/lib/supabaseServer.ts`, `src/lib/supabase/clientAudit.ts`, `src/lib/supabase/egressAudit.ts`, `src/lib/supabase/fetchResilient.ts`
- Modify: `src/lib/serverRoleCache.ts` (hapus jalur `SUPABASE_JWT_SECRET`), `src/lib/social/*` yang masih mengimpor supabase
- Modify: 5 route ber-RPC (`project/view`, `project/pustaka`, `source/project/pustaka`, `source/project/search`)
- Modify: `package.json`

**Step 1:** Hapus file & import; `grep -rn "supabase" src` harus **0**.
**Step 2:** `grep -rn "@supabase" package.json` → kosong, lalu `npm install`.
**Step 3:** `npx tsc -p tsconfig.json --noEmit` → bersih.
**Step 4:** Deploy staging + uji regresi (lihat bagian Validation).
**Step 5: Commit**
```bash
git add -A
git commit -m "refactor(auth): hapus total dependensi Supabase"
```

---

## Tests / Validation

**Smoke otomatis** (`scripts/test-auth-local.mjs`, dijalankan setelah deploy):
1. `GET /api/auth/me` tanpa cookie → **401**
2. Token access sendiri (ditandatangani `AUTH_JWT_SECRET`) → `/api/me/profile` **200**, `id` sama dengan UUID profil
3. Token signature salah → **401**
4. Token kedaluwarsa → **401**
5. `POST /api/auth/logout` → sesi dicabut, `me` berikutnya **401**
6. Ban akun uji → endpoint auth-required **403**; unban → **200**
7. Filter 18+ project masih menyembunyikan 5 seri (regresi fitur terakhir)

**Regresi manual (browser, akun sendiri)**
- Login Google → beranda, buka chapter, komentar, XP bertambah, bookmark tersimpan.
- Buka `/files` (favorit/koleksi), `/marathon` (chapter hari ini bertambah), `/setting` (ganti border & privasi), `/dashboard` (admin).
- Logout → semua halaman publik tetap bisa dibuka, aksi yang butuh login memunculkan modal.

**Ukur keberhasilan**
- Supabase Auth logs: request dari IP VPS (`103.103.22.251`) = **0**.
- Egress Supabase harian turun ke ~0 (PostgREST sudah 1.4%, RPC mati dihapus).
- Latensi `/api/me/profile` tetap ~100 ms.

---

## Risks, Tradeoffs, Open Questions

**Risiko utama**
1. **Sesi lama putus** kalau dual-verify dimatikan sebelum semua user login ulang. Mitigasi: Fase E hanya setelah 7–14 hari dual-run; user lama otomatis dimigrasi saat login berikutnya (by email/google_sub).
2. **UUID tertukar** kalau `upsertAuthUser` salah mencocokkan (mis. email sama beda orang). Mitigasi: prioritas `google_sub` → `auth_users.google_sub`, lalu email exact di `auth_users`, lalu `social_profiles.email`; kalau email ketemu tapi `google_sub` beda dan sudah terisi, **tolak** dan log.
3. **Keamanan sesi**: refresh token di cookie httpOnly + hash di DB; wajib `secure`, `sameSite=lax`, rotasi saat dipakai, revoke saat ban/logout.
4. **Google OAuth config**: perlu Client ID/Secret dan redirect URI `https://ryukomik.my.id/api/auth/google/callback` di Google Cloud Console. Yang sekarang dipakai Supabase bisa dipakai ulang (tambah URI baru).
5. **CSRF**: route state-changing sudah punya `assertSameOrigin`; pastikan logout juga memakainya.

**Tradeoff**
- Kehilangan fitur bawaan Supabase (email template, rate limit login, MFA). Untuk satu provider OAuth, ini bisa diterima; rate limit login perlu dibuat sederhana di route start.
- Kamu jadi pemilik insiden auth (tidak ada support vendor).

**Pertanyaan terbuka**
1. Masa berlaku access token: 7 hari (nyaman) atau 1 jam + refresh (lebih aman)? Rekomendasi: access 7 hari + refresh 30 hari dengan rotasi.
2. Perlu tetap mendukung login email/password nanti? Kalau ya, skema `auth_users` perlu kolom `password_hash` sejak awal.
3. Apakah akun yang diblokir boleh login lalu melihat halaman banned (seperti sekarang), atau ditolak total di callback? Rekomendasi: tetap login, tampilkan BanGate (perilaku sekarang).
4. Setelah Supabase dimatikan, apakah project Supabase langsung dihapus atau disimpan 30 hari sebagai arsip?

---

## Rollback Plan

- **Fase A–D**: tidak ada perubahan perilaku user; rollback = `git revert` commit fase terkait, sesi Supabase tetap berfungsi.
- **Fase E (hapus Supabase)**: simpan branch `pre-auth-cutover`; rollback = deploy ulang branch itu + re-enable env Supabase (project belum dihapus sampai 14 hari).
- Data baru (`auth_users`, `auth_sessions`) tidak mengubah tabel sosial, jadi rollback tidak kehilangan XP/komentar.
