# Marathon Reading Event (Weekly & Monthly Leaderboard) — Implementation Plan

> **For Hermes:** implement task-by-task dengan `superpowers:test-driven-development`. Plan ini BELUM dieksekusi.

**Goal:** Event "Marathon Baca" dengan leaderboard **mingguan** & **bulanan**, top 1–3 dapat hadiah (premium + label), seluruh data event disimpan di **database lokal (Postgres `ryukomik_social`)** — **tanpa Supabase**.

**Architecture:** Event membaca *read log* yang sudah ada di choke point server `/api/xp/read` (satu-satunya tempat chapter tercatat). Setelah RPC XP Supabase sukses, chapter yang sama dicatat ke Postgres lokal (`marathon_reads`) → di-roll-up ke `marathon_scores` → dibaca leaderboard dari lokal + join `social_profiles` (username/avatar sudah ada di lokal). Pemenang dibekukan oleh cron harian ke `marathon_winners` dan hadiah di-approve admin.

**Tech Stack:** Next.js 16 (App Router), `pg` Pool via `src/lib/social/db.ts`, Postgres lokal `ryukomik_social`, crontab VPS, Tailwind.

**Prinsip kunci:**
- **0 egress Supabase tambahan.** Semua baca/tulis event ke Postgres lokal.
- **Idempoten.** 1 chapter dihitung 1× per periode (unique index), walau client flush batch berkali-kali.
- **Tidak boleh menggagalkan tracking XP.** Semua penulisan event dibungkus `catch` — kalau DB lokal error, `/api/xp/read` tetap sukses.

---

## Current Context (hasil analisis, 2026-10-25)

| Komponen | Kondisi sekarang | Relevansi |
|---|---|---|
| `src/app/api/xp/read/route.ts` | Satu-satunya titik server yang mencatat bacaan. Body `chapter_slugs` (maks 20, unik), panggil RPC Supabase `record_user_reads_batch` (`p_xp_amount: 5`). | **Titik hook utama.** |
| `src/hooks/useXpRead.ts` | Client antre di localStorage, flush tiap 5 menit / saat tab hidden / tiap 10 chapter. | Tidak perlu diubah. |
| `src/app/api/leaderboard/route.ts` | All-time dari Supabase `profiles.xp` & `total_reads`, cache 1 jam. | Tidak diubah (event terpisah). |
| `src/app/leaderboard/page.tsx` | Tab XP & Chapter (client). | Ditambah entry point ke `/marathon`. |
| `src/lib/social/db.ts` | `socialQuery()` / `socialTransaction()` → Pool ke `SOCIAL_DATABASE_URL` (`ryukomik_social`). | **Basis data event.** |
| `social_profiles` (lokal) | `user_id, username, avatar_url, level, is_premium, total_reads, ...` | Sumber nama/avatar leaderboard — tanpa Supabase. |
| `src/lib/serverRoleCache.ts` | `getCachedRole(userId)` → `isBanned`, `isAdmin` (cache 1 jam, tag `profile-role`). | Dipakai menolak user dibanned. |
| crontab VPS | Sudah ada pola job harian (`ryukomik-app-api`, OCR retention). | Tempat finalisasi periode. |
| PM2 `ryukomik` | port 3008, `PROJECT_API_URL=4101`. | Deploy target. |

**Yang belum ada:** tabel event apa pun di lokal (hanya ada `social_activity_events`, bukan leaderboard).

---

## Keputusan Desain

1. **Metrik = jumlah chapter unik per periode.** Membaca ulang chapter yang sama di periode yang sama tidak menambah skor. (Bisa diganti jadi "semua read event" kalau diminta.)
2. **Batas periode (WIB / Asia/Jakarta):**
   - Mingguan: Senin 00:00 → Minggu 23:59 (`period_key = 2026-W43`)
   - Bulanan: tanggal 1 00:00 → akhir bulan (`period_key = 2026-10`)
3. **Batas anti-bot:** maksimum `daily_chapter_cap` (default 300) chapter/hari/user. Chapter di atas cap diabaikan.
4. **Hadiah tidak auto-grant.** Cron membekukan pemenang sebagai `pending`; admin klik "Grant" di dashboard → premium diberikan lewat `PATCH /api/admin/users` (`action: "premium"`) yang sudah ada + audit log sudah ada. Ini mencegah hadiah salah orang.
5. **Event aktif ditentukan `starts_at`/`ends_at` + `is_active`**, disimpan di lokal, di-cache 60 detik di memori proses.

---

## Skema Database (lokal `ryukomik_social`)

**Create:** `database/social/006_marathon_event.sql`

```sql
-- Event config (boleh banyak baris; yang dipakai = is_active & waktu cocok)
create table if not exists marathon_events (
  id            bigserial primary key,
  slug          text not null unique,
  title         text not null,
  description   text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  is_active     boolean not null default true,
  prize_1       text,
  prize_2       text,
  prize_3       text,
  premium_days_1 int not null default 0,
  premium_days_2 int not null default 0,
  premium_days_3 int not null default 0,
  daily_chapter_cap int not null default 300,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Log mentah (idempoten per user+chapter+periode)
create table if not exists marathon_reads (
  id          bigserial primary key,
  event_id    bigint not null references marathon_events(id) on delete cascade,
  user_id     uuid not null,
  chapter_slug text not null,
  period_type text not null check (period_type in ('weekly','monthly')),
  period_key  text not null,
  read_at     timestamptz not null default now(),
  unique (event_id, user_id, chapter_slug, period_type, period_key)
);
create index if not exists marathon_reads_user_day_idx
  on marathon_reads (user_id, read_at desc);
create index if not exists marathon_reads_period_idx
  on marathon_reads (event_id, period_type, period_key, user_id);

-- Roll-up skor (dibaca leaderboard)
create table if not exists marathon_scores (
  event_id    bigint not null references marathon_events(id) on delete cascade,
  user_id     uuid not null,
  period_type text not null check (period_type in ('weekly','monthly')),
  period_key  text not null,
  chapters    int not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (event_id, user_id, period_type, period_key)
);
create index if not exists marathon_scores_rank_idx
  on marathon_scores (event_id, period_type, period_key, chapters desc, updated_at asc);

-- Pemenang dibekukan
create table if not exists marathon_winners (
  id          bigserial primary key,
  event_id    bigint not null references marathon_events(id) on delete cascade,
  period_type text not null,
  period_key  text not null,
  rank        int not null check (rank between 1 and 10),
  user_id     uuid not null,
  username    text,
  chapters    int not null,
  prize_label text,
  premium_days int not null default 0,
  status      text not null default 'pending' check (status in ('pending','granted','void')),
  granted_at  timestamptz,
  granted_by  uuid,
  created_at  timestamptz not null default now(),
  unique (event_id, period_type, period_key, rank)
);

create index if not exists marathon_winners_lookup_idx
  on marathon_winners (event_id, period_type, period_key, rank);
```

Seed event pertama (contoh 1 Nov – 31 Des 2026):

```sql
insert into marathon_events (slug, title, description, starts_at, ends_at,
  prize_1, prize_2, prize_3, premium_days_1, premium_days_2, premium_days_3)
values (
  'marathon-baca-2026-q4',
  'Marathon Baca Ryukomik',
  'Baca sebanyak mungkin chapter tiap minggu & bulan. Juara 1-3 dapat premium gratis.',
  '2026-11-01 00:00:00+07',
  '2026-12-31 23:59:59+07',
  'Premium 30 hari + badge Juara 1', 'Premium 14 hari + badge Juara 2', 'Premium 7 hari + badge Juara 3',
  30, 14, 7
)
on conflict (slug) do nothing;
```

---

## Step-by-Step Plan

### Task 1 — Periode & aturan murni (TDD, tanpa DB)

**Objective:** Fungsi murni untuk kunci periode WIB, validasi event aktif, dan cap harian.

**Files:**
- Create: `src/lib/marathon/period.ts`
- Test: `marathon-period.test.cjs`

**Step 1: tulis test gagal**

```js
const { weekKey, monthKey, isEventActive, capRemaining } = loadTs('src/lib/marathon/period.ts');

test('weekKey uses ISO week in Asia/Jakarta', () => {
  // Senin 2026-10-26 00:00 WIB -> minggu W44
  assert.equal(weekKey(new Date('2026-10-25T17:00:00Z')), '2026-W44');
  // Minggu 2026-10-25 23:59 WIB masih W43
  assert.equal(weekKey(new Date('2026-10-25T16:59:00Z')), '2026-W43');
});

test('monthKey uses WIB calendar month', () => {
  assert.equal(monthKey(new Date('2026-10-31T16:59:00Z')), '2026-10'); // 31 Okt 23:59 WIB
  assert.equal(monthKey(new Date('2026-10-31T17:00:00Z')), '2026-11'); // 1 Nov 00:00 WIB
});

test('event window and daily cap', () => {
  const ev = { starts_at: '2026-11-01T00:00:00+07:00', ends_at: '2026-12-31T23:59:59+07:00', is_active: true };
  assert.equal(isEventActive(ev, new Date('2026-11-10T00:00:00+07:00')), true);
  assert.equal(isEventActive(ev, new Date('2026-12-31T23:59:59+07:00')), true);
  assert.equal(isEventActive(ev, new Date('2027-01-01T00:00:00+07:00')), false);
  assert.equal(isEventActive({ ...ev, is_active: false }, new Date('2026-11-10T00:00:00+07:00')), false);
  assert.equal(capRemaining(299, 300), 1);
  assert.equal(capRemaining(300, 300), 0);
  assert.equal(capRemaining(0, 300), 300);
});
```

**Step 2: run** `node --test marathon-period.test.cjs` → FAIL (module belum ada).

**Step 3: implementasi** `src/lib/marathon/period.ts`

```ts
const TZ = "Asia/Jakarta";

function partsInJakarta(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day) };
}

/** ISO-8601 week key in WIB, e.g. 2026-W44 */
export function weekKey(date: Date = new Date()): string {
  const { y, m, d } = partsInJakarta(date);
  // ISO week dihitung dari tanggal lokal WIB sebagai UTC-midnight (tanpa geser lagi)
  const t = new Date(Date.UTC(y, m - 1, d));
  const dayNum = t.getUTCDay() || 7;           // Senin=1..Minggu=7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);   // ke Kamis minggu itu
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Calendar month key in WIB, e.g. 2026-10 */
export function monthKey(date: Date = new Date()): string {
  const { y, m } = partsInJakarta(date);
  return `${y}-${String(m).padStart(2, "0")}`;
}

export type MarathonEventRow = {
  starts_at: string; ends_at?: string | null; is_active: boolean;
};

export function isEventActive(ev: MarathonEventRow, now: Date = new Date()): boolean {
  if (!ev?.is_active) return false;
  const t = now.getTime();
  if (Number.isNaN(Date.parse(ev.starts_at))) return false;
  if (t < Date.parse(ev.starts_at)) return false;
  if (ev.ends_at) {
    const end = Date.parse(ev.ends_at);
    if (Number.isNaN(end) || t > end) return false;
  }
  return true;
}

export function capRemaining(todayCount: number, cap: number): number {
  return Math.max(0, cap - Math.max(0, todayCount));
}
```

**Step 4: run** → PASS (4 test).
**Step 5: commit** `feat(marathon): pure period and cap rules`

---

### Task 2 — Repositori lokal event

**Objective:** Semua akses SQL event di satu modul, pakai `socialQuery`/`socialTransaction`.

**Files:**
- Create: `src/lib/marathon/repository.ts`

Fungsi wajib:

```ts
import "server-only";
import { socialQuery, socialTransaction } from "@/lib/social/db";
import { weekKey, monthKey, isEventActive, capRemaining, type MarathonEventRow } from "./period";

let cachedEvent: { at: number; row: (MarathonEventRow & { id: string; daily_chapter_cap: number; slug: string; title: string; prize_1: string | null; prize_2: string | null; prize_3: string | null; premium_days_1: number; premium_days_2: number; premium_days_3: number }) | null } | null = null;

export async function getActiveEvent(now = new Date()) {
  if (cachedEvent && Date.now() - cachedEvent.at < 60_000) {
    return isEventActive(cachedEvent.row!, now) ? cachedEvent.row : null;
  }
  const { rows } = await socialQuery(
    `select * from marathon_events
      where is_active and starts_at <= $1 and (ends_at is null or ends_at >= $1)
      order by starts_at desc limit 1`, [now.toISOString()]);
  cachedEvent = { at: Date.now(), row: rows[0] ?? null };
  return rows[0] ?? null;
}

/** Catat chapter baru untuk user. Mengembalikan jumlah yang benar-benar baru per periode. */
export async function recordMarathonReads(userId: string, slugs: string[], now = new Date()) {
  const event = await getActiveEvent(now);
  if (!event) return { weekly: 0, monthly: 0 };

  const wk = weekKey(now);
  const mo = monthKey(now);

  return socialTransaction(async (client) => {
    // Batas harian (WIB)
    const { rows: capRows } = await client.query(
      `select count(*)::int as c from marathon_reads
        where user_id = $1
          and read_at >= (date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta')`,
      [userId]);
    const remaining = capRemaining(capRows[0]?.c ?? 0, event.daily_chapter_cap);
    if (remaining <= 0) return { weekly: 0, monthly: 0 };

    const limited = slugs.slice(0, remaining);
    let weekly = 0, monthly = 0;

    for (const period of [{ type: "weekly", key: wk }, { type: "monthly", key: mo }]) {
      const { rows } = await client.query(
        `insert into marathon_reads (event_id, user_id, chapter_slug, period_type, period_key)
         select $1, $2, s, $3, $4 from unnest($5::text[]) as s
         on conflict (event_id, user_id, chapter_slug, period_type, period_key) do nothing
         returning 1`,
        [event.id, userId, period.type, period.key, limited]);
      const inserted = rows.length;
      if (period.type === "weekly") weekly = inserted; else monthly = inserted;
      if (inserted > 0) {
        await client.query(
          `insert into marathon_scores (event_id, user_id, period_type, period_key, chapters)
           values ($1,$2,$3,$4,$5)
           on conflict (event_id, user_id, period_type, period_key)
           do update set chapters = marathon_scores.chapters + excluded.chapters, updated_at = now()`,
          [event.id, userId, period.type, period.key, inserted]);
      }
    }
    return { weekly, monthly };
  });
}

export async function getLeaderboard(periodType: "weekly"|"monthly", limit = 25, now = new Date()) {
  const event = await getActiveEvent(now);
  if (!event) return { event: null, periodKey: null, rows: [] };
  const key = periodType === "weekly" ? weekKey(now) : monthKey(now);
  const { rows } = await socialQuery(
    `select s.user_id, s.chapters, s.updated_at,
            coalesce(p.username, 'user') as username, p.avatar_url, p.level, p.is_premium,
            row_number() over (order by s.chapters desc, s.updated_at asc) as rank
       from marathon_scores s
       left join social_profiles p on p.user_id = s.user_id
      where s.event_id = $1 and s.period_type = $2 and s.period_key = $3
      order by s.chapters desc, s.updated_at asc
      limit $4`, [event.id, periodType, key, limit]);
  return { event, periodKey: key, rows };
}

export async function getUserStanding(userId: string, periodType: "weekly"|"monthly", now = new Date()) {
  const event = await getActiveEvent(now);
  if (!event) return null;
  const key = periodType === "weekly" ? weekKey(now) : monthKey(now);
  const { rows } = await socialQuery(
    `with ranked as (
       select user_id, chapters,
              row_number() over (order by chapters desc, updated_at asc) as rank
         from marathon_scores
        where event_id = $1 and period_type = $2 and period_key = $3
     )
     select * from ranked where user_id = $4`, [event.id, periodType, key, userId]);
  return rows[0] ?? { user_id: userId, chapters: 0, rank: null };
}
```

**Validasi:** `npx tsc --noEmit` → 0.
**Commit:** `feat(marathon): local repository for reads, scores and leaderboard`

---

### Task 3 — Hook ke `/api/xp/read`

**Objective:** Catat ke DB lokal setiap kali RPC XP sukses, tanpa pernah menggagalkan request.

**Files:**
- Modify: `src/app/api/xp/read/route.ts` (setelah `if(error)throw error;`)

```ts
    const recorded = Number(result?.recorded_count) || 0;
    if (recorded > 0) {
      // Event lokal: jangan pernah menggagalkan tracking XP kalau DB lokal bermasalah.
      void recordMarathonReads(userId, chapterSlugs).catch((e) =>
        console.error("[marathon] record failed:", e instanceof Error ? e.message : e));
    }
```

**Verifikasi:**
1. `curl -X POST /api/xp/read` tanpa token → **401** (tidak berubah).
2. Setelah login & baca chapter, query lokal:
   `select * from marathon_scores order by updated_at desc limit 5;` → bertambah.
3. Matikan sementara `SOCIAL_DATABASE_URL` (test di lokal) → endpoint tetap **200** (bukti tidak blocking).

**Commit:** `feat(marathon): record read chapters into local event store`

---

### Task 4 — API publik leaderboard + standing

**Files:**
- Create: `src/app/api/marathon/leaderboard/route.ts`
- Create: `src/app/api/marathon/me/route.ts`

`leaderboard/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/marathon/repository";

export const revalidate = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") === "monthly" ? "monthly" : "weekly";
  try {
    const data = await getLeaderboard(period, 25);
    const res = NextResponse.json({ period, ...data });
    res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return res;
  } catch {
    return NextResponse.json({ period, event: null, rows: [] }, { status: 200 });
  }
}
```

`me/route.ts`: `requireUserId` + `getUserStanding` untuk weekly & monthly, cache `private, max-age=30`.

**Verifikasi:** `curl "https://ryukomik.my.id/api/marathon/leaderboard?period=weekly"` → `200` + `rows: []` (sebelum ada data). `?period=monthly` → 200.

**Commit:** `feat(marathon): public leaderboard and personal standing APIs`

---

### Task 5 — Halaman `/marathon`

**Files:**
- Create: `src/app/marathon/page.tsx` (server shell)
- Create: `src/app/marathon/MarathonClient.tsx`

Isi UI:
1. Header: judul event, deskripsi, **countdown** ke akhir periode (minggu/bulan).
2. Segmented toggle **Mingguan / Bulanan**.
3. Podium top 3 (card besar, avatar dari `social_profiles`) + daftar rank 4–25.
4. Panel hadiah: `prize_1/2/3` dari event.
5. Kalau login: card "Posisi kamu — rank X, Y chapter, kurang Z chapter untuk top 3".
6. Empty state: "Belum ada peserta — jadilah yang pertama!".
7. Fetch `/api/marathon/leaderboard?period=...` + `/api/marathon/me`; **wajib** ada `catch` + `AbortSignal.timeout(15000)` (pelajaran dari incident spinner Request tab).

**Verifikasi:** buka `/marathon` → 200, toggle mingguan/bulanan berfungsi, tidak ada console error, layout aman di 360px.

**Commit:** `feat(marathon): weekly and monthly leaderboard page`

---

### Task 6 — Cron finalisasi pemenang

**Files:**
- Create: `scripts/marathon-finalize.mjs`
- Modify: crontab (`10 0 * * *`, setelah tengah malam WIB)

Logika script:
1. Baca semua event aktif.
2. Hitung periode yang **sudah berakhir** dan belum punya pemenang:
   - minggu lalu (`weekKey(now - 7 hari)`), bulan lalu (`monthKey(now - 1 bulan)`)
3. Ambil top 3 dari `marathon_scores` untuk periode itu, join `social_profiles`.
4. `insert ... on conflict (event_id, period_type, period_key, rank) do nothing` → `status='pending'`, isi `prize_label` + `premium_days` sesuai rank.
5. Log ringkas ke stdout (`+3 winners weekly 2026-W43`).

**Verifikasi:**
- Jalankan manual: `node --env-file=/home/ryukomik/ryukomik/.env.local scripts/marathon-finalize.mjs`
- Jalankan **dua kali** → tidak ada duplikat (idempoten).
- `select * from marathon_winners order by id desc limit 5;`

**Commit:** `feat(marathon): daily finalizer cron for frozen winners`

---

### Task 7 — Admin API (config event + grant hadiah)

**Files:**
- Create: `src/app/api/admin/marathon/route.ts`

| Method | Fungsi |
|---|---|
| `GET` | event aktif + daftar `marathon_winners` (filter `status`, `period_type`) |
| `PATCH` | ubah event: `title`, `description`, `starts_at`, `ends_at`, `is_active`, `prize_*`, `premium_days_*`, `daily_chapter_cap` |
| `POST` | `action: "grant"` + `winner_id` → set `status='granted'`, `granted_at`, `granted_by`. **Grant premium** memanggil logika premium yang sudah ada (refactor kecil: ekstrak `grantPremium(userId, days)` dari `PATCH /api/admin/users` ke `src/lib/adminPremium.ts`, dipakai dua route). |
| `POST` | `action: "void"` + `winner_id` → `status='void'` |

Semua method: `verifyAdminRequest`, `privateAdminJson`, tulis audit via `recordAdminAction` (tambah action `marathon_grant` / `marathon_config`).

**Verifikasi:** tanpa token → 401; dengan admin → 200; grant pada winner `pending` → `granted` + `profiles.premium_until` bertambah (Supabase, lewat API yang sudah ada).

**Commit:** `feat(marathon): admin API for event config and prize granting`

---

### Task 8 — Dashboard tab "Marathon"

**Files:**
- Create: `src/components/dashboard/MarathonTab.tsx`
- Modify: `src/app/dashboard/DashboardClient.tsx` (tambah `"marathon"` ke `validPages` + render tab)

Isi tab:
- Form config event (tanggal, hadiah, cap harian) + tombol simpan.
- Tabel pemenang: periode, rank, username, chapter, status, tombol **Grant** / **Void**.
- Peringatan kecil: "Hadiah premium diberikan manual — cek username sebelum grant."

**Verifikasi:** buka `/dashboard?page=marathon`, simpan config → nilai tersimpan; grant → status berubah + muncul di Audit Log.

**Commit:** `feat(marathon): dashboard tab for event config and prize approval`

---

### Task 9 — Entry point & promosi

**Files:**
- Modify: `src/app/leaderboard/page.tsx` — tambah card/link ke `/marathon` (di atas tab XP/Chapter).
- Modify: `src/app/sitemap.ts` — tambah `/marathon`.
- Opsional: 1 baris `social_announcements` untuk pengumuman event.

**Verifikasi:** link dari `/leaderboard` → `/marathon` bisa diklik; `/sitemap.xml` memuat `/marathon`.

**Commit:** `feat(marathon): link event from leaderboard and sitemap`

---

### Task 10 — Deploy & verifikasi end-to-end

1. `node --test` semua test (harus 100% pass) + `npx tsc --noEmit` (0).
2. Staging build → swap `.next` → `pm2 restart ryukomik --update-env` (`PROJECT_API_URL=4101`, `ADMIN_USER_IDS`).
3. Health check: `/`, `/marathon`, `/leaderboard`, `/dashboard`.
4. Cron terpasang: `crontab -l | grep marathon`.
5. Baca 3 chapter sebagai user uji → cek `marathon_scores.chapters` naik 3 → leaderboard menampilkan user itu.
6. Baca ulang chapter yang sama → skor **tidak** bertambah (idempotensi).
7. Jalankan finalizer manual → muncul 3 winner `pending` → grant 1 → premium bertambah.

---

## Files Likely to Change

**Baru:**
- `database/social/006_marathon_event.sql`
- `src/lib/marathon/period.ts`
- `src/lib/marathon/repository.ts`
- `src/lib/adminPremium.ts` (ekstraksi dari `admin/users`)
- `src/app/api/marathon/leaderboard/route.ts`
- `src/app/api/marathon/me/route.ts`
- `src/app/api/admin/marathon/route.ts`
- `src/app/marathon/page.tsx`
- `src/app/marathon/MarathonClient.tsx`
- `src/components/dashboard/MarathonTab.tsx`
- `scripts/marathon-finalize.mjs`
- `marathon-period.test.cjs`

**Diubah:**
- `src/app/api/xp/read/route.ts`
- `src/app/api/admin/users/route.ts` (pakai `grantPremium` bersama)
- `src/app/dashboard/DashboardClient.tsx`
- `src/app/leaderboard/page.tsx`
- `src/app/sitemap.ts`
- crontab VPS

---

## Tests / Validation

| Level | Target |
|---|---|
| Unit | `marathon-period.test.cjs`: weekKey/monthKey lintas batas tengah malam WIB, `isEventActive`, `capRemaining` |
| Unit | idempotensi period key: chapter sama di minggu berbeda = 2 baris; minggu sama = 1 baris |
| Integration (manual, DB lokal) | baca 3 chapter → `chapters=3`; baca ulang → tetap 3 |
| Integration | cap harian: baca > cap → sisanya diabaikan |
| API | `/api/marathon/leaderboard` 200 walau DB kosong; `/api/marathon/me` 401 tanpa token |
| Admin | grant winner → premium naik + audit log tercatat |
| Cron | dijalankan 2× → tidak ada duplikat winner |
| Regression | `premium-chapter-access`, `security-auth-hardening`, `image-proxy`, `ad-premium-gating`, `supabase-fetch-resilience` tetap pass |

---

## Risks / Tradeoffs

1. **Read tracking bergantung pada client flush.** Kalau user menutup tab sebelum flush 5 menit, bacaan bisa hilang (perilaku lama, bukan hal baru). Mitigasi opsional: flush saat `visibilitychange` (sudah ada).
2. **`/api/xp/read` menulis ke 2 database** (Supabase RPC + lokal). Kalau lokal down, event tidak mencatat — tapi XP tetap jalan (`catch`).
3. **Timezone.** Semua batas periode WIB. Kalau server TZ berubah, tetap aman karena dihitung eksplisit `Asia/Jakarta`.
4. **Cheat.** Cap 300/hari + dedupe chapter menahan bot naif, bukan bot canggih. Kalau perlu, tambah syarat "minimal jeda 20 detik antar chapter" di iterasi berikut.
5. **Beban lokal DB.** Insert batch ≤20 baris per flush, satu user. Skala aman. Index sudah disiapkan.
6. **Grant premium manual** = intervensi admin. Ini pilihan sadar (aman) dibanding auto-grant yang berisiko salah orang.
7. **`social_profiles` mungkin belum punya baris** untuk user yang jarang sosial. Mitigasi: `left join` + fallback username `user`, dan opsional `upsertSocialProfile(userId)` saat pertama tercatat.

---

## Open Questions (butuh keputusan sebelum eksekusi)

1. **Metrik:** chapter **unik** per periode (default plan) — atau semua read event (re-read dihitung)?
2. **Hadiah:** premium + label (default) — atau ada hadiah lain (saldo, merchandise, badge khusus)?
3. **Auto-grant vs manual:** default manual (admin approve). Mau otomatis?
4. **Tanggal mulai event:** plan pakai contoh 1 Nov 2026. Mau mulai sekarang?
5. **Batas peserta:** semua user login, atau minimal level tertentu (mis. level 5) untuk menahan akun baru spam?
6. **Tampilan:** perlu muncul juga di homepage (`/`) sebagai banner, atau cukup di `/leaderboard` + `/marathon`?

---

## Estimasi

| Bagian | Perkiraan |
|---|---|
| Skema + repo + hook + API | 1 sesi |
| Halaman `/marathon` | 1 sesi |
| Cron + admin API + tab dashboard | 1 sesi |
| Test + deploy + verifikasi | setengah sesi |

**Total: ±3–4 sesi kerja**, tanpa menambah egress Supabase.
