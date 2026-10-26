# Catatan Audit Egress Supabase (17 Okt 2026)

Status: **SELESAI 26 Okt 2026** — audit dimatikan (`EGRESS_AUDIT=0`), log baseline diarsipkan di `data/archive/egress-2026-10-26/`. Ringkasan hasil migrasi ada di `docs/profiles-local-migration.md`. Instrumen pengukur terpasang sementara di
frontend `ryukomik` supaya penghematan menyasar pihak yang benar-benar
terbesar — bukan tebakan dari baca kode.

## Konteks
- Dashboard Supabase (08 Agu 2026): total ~100 MB/hari → **PostgREST 92,8%
  (92,98 MB)**, Auth 7,2% (7,19 MB). Bulanan ±3,0 GB, user mencatat 3,81 GB.
- Semua jalur utama SUDAH dicek dan sudah di-cache rapi, jadi pemborosnya
  tersebar:
  - `/api/comments` (29.939 req/hari): in-memory per-key 30 menit + dedup;
    18.357 key unik/hari → long tail, tapi respons rata-rata hanya ~100 B
    (total 1,9 MB/hari) → bukan penyumbang.
  - `/api/comment-badges` (29.928 req): `unstable_cache` 600 dtk.
  - `/api/ads-config` (16.715 req): `unstable_cache` 60 dtk.
  - `/api/project/pustaka`: jalan ke PostgreSQL VPS lokal (Supabase cuma
    fallback).
  - Halaman `/u/<username>` (13.728 req): datanya dari `/api/social` (PostgreSQL
    VPS), metadata dari `getPublicProfileByUsernameCached`.
  - `profileCache` browser: in-memory + sessionStorage, TTL 15 mnt, SWR 60 mnt.
  - `/api/xp/read`: 1 RPC kecil per panggilan.
- Dashboard Supabase tidak bisa dibuka (tidak ada login tersimpan di vault).

## Instrumen yang terpasang
- `src/lib/supabase/egressAudit.ts` — membungkus `supabaseAdmin`, menghitung
  jumlah query + bytes respons per `from:tabel` / `rpc:nama`. Rekam di titik
  `then` (jangan bungkus hasil `.select()` jadi Promise — merusak rantai builder,
  pernah bikin `TypeError: .eq is not a function`).
- `src/lib/supabase/admin.ts` — dipatch: pakai wrapper hanya jika
  `EGRESS_AUDIT=1`.
- `.env.local` → `EGRESS_AUDIT=1` (file ini sudah di-gitignore).
- Output: `data/egress-audit.jsonl`, satu baris JSON tiap 5 menit.

## Data awal (5 menit pertama pasca-deploy — didominasi revalidation, BELUM
representatif)
```
from:comments                164 query   17.205 B   (~105 B/query)
from:profiles                 57 query   13.611 B   (~240 B/query)
rpc:record_user_reads_batch   57 query    1.995 B
from:app_settings              7 query    4.719 B
```

## Langkah berikutnya (WAJIB diselesaikan)
1. Biarkan audit berjalan beberapa jam trafik normal (±3–6 jam).
2. Agregat `data/egress-audit.jsonl` → total query + bytes per tabel/RPC →
   kalikan ke skala harian → ranking pemboros terbesar.
3. Kurangi query terbesar (cache per-entity / perpanjang TTL / gabung query /
   pindah baca ke PostgreSQL VPS), tanpa menambah query Supabase.
4. **Pembersihan sebelum commit akhir**:
   - hapus `EGRESS_AUDIT=1` dari `.env.local`
   - hapus `src/lib/supabase/egressAudit.ts`
   - kembalikan `src/lib/supabase/admin.ts` ke `createClient` biasa
   - hapus `data/egress-audit.jsonl`
   - build + `pm2 restart ryukomik` + verifikasi halaman utama & `/api/ads-config`
5. Catat hasil penghematan (MB/hari sebelum → sesudah) di commit.

## Aturan yang tidak boleh dilanggar
- Jangan menambah query Supabase (permintaan eksplisit user).
- `data/premium-lock-monitor-20261004.jsonl` dibiarkan untracked.
