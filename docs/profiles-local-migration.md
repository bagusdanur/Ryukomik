# Migrasi profil & XP ke Postgres lokal (selesai 26 Okt 2026)

Status: **selesai (irisan 0–4)**. Supabase tidak lagi menyimpan atau melayani
data profil/XP untuk aplikasi web.

## Pembagian data sekarang

| Data | Sumber | Catatan |
|---|---|---|
| Login, JWT, sesi, metadata nama/avatar di sesi | **Supabase Auth** | satu-satunya peran Supabase untuk identitas |
| Profil (username, avatar, bio, banner, privacy) | `social_profiles` lokal | ditulis lewat `PATCH /api/me/profile` |
| Role, premium, banned | `social_profiles` lokal | ditulis `updateLocalProfile()`; ban juga dipasang di Auth |
| XP, level, total_reads | `social_profiles` lokal | `addXp()` / `recordReads()` di `src/lib/social/xp.ts` |
| Riwayat baca (dedupe XP) | `user_reads` lokal | PK `(user_id, chapter_slug)` |
| Komentar | Supabase `comments` | nama/avatar penulis dibaca dari lokal; belum dimigrasi |
| Uang (transaksi, kode premium, permintaan premium) | Supabase | tetap di sana sampai provider baru dipasang |
| Config aplikasi (ads/apk/title rush) | cache file lokal + Supabase saat cache kosong | `src/lib/localSettings.ts` |

**Tidak ada sinkronisasi.** Tidak ada mirror, tidak ada repair berkala, tidak ada
dual-write. Satu entitas = satu database. Permintaan eksplisit user: sinkron
membuat PostgREST naik.

## Aturan yang harus dipegang

1. Jangan menambah jalur sinkron Supabase→lokal, termasuk "sekadar menyegarkan".
2. Penulisan profil **selalu** lewat `updateLocalProfile()` (mencatat
   `profile_write_log`), bukan UPDATE ad-hoc.
3. Rumus level: `level = floor(xp / 100) + 1`.
4. XP baca idempoten lewat `user_reads (user_id, chapter_slug)`; jangan menambah
   XP tanpa insert tersebut.
5. Bootstrap profil: `ensureSocialProfile()` hanya membuat baris lokal untuk user
   yang belum punya (pendaftar baru) — satu query Supabase per user baru, bukan
   berkala.

## Backup

- `scripts/backup-social.sh` + cron **03:20** harian → `/home/ryukomik/backups/ryukomik-social`
  (retensi 14 hari, arsip divalidasi `pg_restore --list`).
- Uji restore sudah dilakukan (10.605 profil / 317 post / 13 ruang nobar saat itu).
- Snapshot sebelum migrasi: `data/profile-import-2026-10-26T04-52-36-522Z.jsonl`.

## Rollback

1. `git revert <commit irisan>` → build staging → swap → restart.
2. Perubahan yang sudah ditulis lokal diputar sekali ke Supabase dari
   `profile_write_log` (skrip sekali pakai, bukan sinkron).
3. Kode lama membaca `profiles` Supabase lagi; data lokal tidak dihapus.

## Pembayaran

- Pakasir ditutup. `PAYMENTS_ENABLED=0` membuat ketiga route pembayaran balas 503
  dan `/premium-pay` menampilkan keterangan.
- Saat provider baru dipasang: isi ulang `create-transaction`, `webhook`,
  `check-status` (verifikasi tanda tangan provider!), lalu set `PAYMENTS_ENABLED=1`.

## Audit egress

Instrumen (`EGRESS_AUDIT`, `NEXT_PUBLIC_EGRESS_AUDIT`) dimatikan setelah migrasi.
Kode tetap ada (dorman) untuk proyek berikutnya (komentar). Log baseline diarsipkan
di `data/archive/egress-2026-10-26/`.
