# Social Database — PostgreSQL (VPS)

Skema database sosial Ryukomik (timeline, postingan, balasan, follow,
koleksi, notifikasi, pengumuman).

## Sumber kebenaran skema

**File-file SQL di direktori ini adalah skema OTORITATIF** untuk database
sosial (`SOCIAL_DATABASE_URL`, PostgreSQL di VPS).

Jalankan berurutan sesuai nomor prefix:

```
001_initial.sql              — profiles, follows, blocks, mutes, posts,
                               likes, bookmarks, activity_events,
                               notifications, collections + trigger counter
002_download_quota.sql       — kuota unduhan
002_notification_cutover.sql — notifikasi pindah dari Supabase ke PostgreSQL
003_announcements.sql        — pengumuman global + reads
004_anime_comments.sql       — kolom context_type/context_id di social_posts
                               (komentar anime per episode menumpang tabel ini)
```

## ⚠️ Jangan salah paham

- `supabase/migrations/20260812*social*.sql` adalah **arsip bersejarah**
  dari zaman database sosial masih di Supabase. **Jangan dijalankan lagi** —
  skemanya sudah usang dan bisa bentrok dengan versi PostgreSQL di sini.
- Kalau menambah kolom/tabel sosial, buat file migrasi BARU di direktori ini
  (`004_*.sql`, dst.), jangan mengedit `001_initial.sql`.

## Konsumen kode

- Koneksi & query: `src/lib/social/db.ts` (pool `pg`, env `SOCIAL_DATABASE_URL`)
- API: `src/app/api/social/*` (23 route, semua lewat `socialQuery`/`socialTransaction`)
- Sync profil dari Supabase: `src/lib/social/profileSync.ts`
  (Supabase tetap jadi sumber profil/roles; PostgreSQL menyimpan data sosial)
