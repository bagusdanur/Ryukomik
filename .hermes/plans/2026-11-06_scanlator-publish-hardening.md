# Scanlator — Pengerasan Sebelum Publish (Plan)

**Tujuan:** menutup celah keamanan & pengawasan Scanlator sebelum dibuka publik, plus konversi gambar ke WebP agar storage/egress tidak jebol.

**Ruang lingkup (sesuai permintaan):** item 1, 3, 4, 7, 8, 9, 10 + WebP.
Urutan eksekusi dipilih dari risiko tertinggi → terendah, dan WebP dikerjakan lebih dulu karena menyentuh jalur upload yang sama dengan item 1 & 3.

| # | Item | Risiko kalau tidak dikerjakan |
|---|------|-------------------------------|
| W | Konversi WebP saat upload | Kuota 2 GB & egress R2 cepat habis; upload lambat |
| 1 | Edit chapter terbit harus re-review | Konten lolos ACC lalu ditukar (18+/bajakan) |
| 3 | Kuota terkunci di hulu (reservasi) | Upload paralel menembus 2 GB |
| 4 | Handle terlarang & verifikasi tim | Impersonasi "Ryu Scanlation" tiruan |
| 7 | Riwayat revisi chapter + audit | Tidak ada bukti saat sengketa |
| 8 | Follow grup + notifikasi chapter baru | Grup tidak bisa tumbuh, pembaca tidak kembali |
| 9 | SEO/OG grup + sitemap | Link grup tampil polos saat dibagikan |
| 10 | Statistik per chapter di Studio | Tim tidak tahu chapter mana yang dibaca |

---

## Status eksekusi (diperbarui 6 Nov 2026)

| Fase | Status | Commit |
|---|---|---|
| W — WebP | **ditunda** (menunggu penjelasan user) | — |
| 1 — Re-review chapter terbit | selesai (opsi B: `pending_image_urls`) | `ceeed7fa` |
| 3 — Reservasi kuota | selesai | `9d47a427` |
| 4 — Handle terlarang, verifikasi, hak unggah | selesai | `72227555` |
| 7 — Riwayat revisi & audit | selesai | `dad9437d` |
| 8 — Follow grup & notifikasi | selesai | `9597559c` |
| 9 — SEO/OG & sitemap | selesai | `9597559c` |
| 10 — Statistik per chapter | selesai | `9597559c` |

---

## Kondisi saat ini (hasil pembacaan kode)

- `src/app/api/scanlator/presign-upload/route.ts` — sudah cek kuota **per file** (`usage.usedBytes + size > QUOTA`), tapi tidak ada reservasi; 10 request paralel bisa lolos bersama.
- `src/app/api/scanlator/series/[slug]/chapter/[chapterId]/route.ts` — `PATCH` menerima `title` dan `image_urls` **kapan saja**, termasuk chapter yang sudah `is_published = true`; tidak mengubah status review.
- `src/app/api/admin/scanlator/review/route.ts` — ACC seri & chapter terpisah (sudah), notifikasi in-app per aksi.
- `migrations/` — tabel `scanlator_applications`, `scanlator_profiles`, `scanlator_notifications`, `scanlator_moderation`; belum ada tabel follow / revisi.
- `src/app/sitemap.ts` — belum memuat `/scanlator/*`.
- `src/app/scanlator/[handle]/page.tsx` — belum punya `generateMetadata` per grup.
- Halaman chapter memiliki `view_count` di project DB (`/projects/:slug/chapter-views`, di-increment `/view`).
- Upload gambar: klien mengompres → sekarang **tidak** mengompres (sesuai permintaan lama) dan langsung presign.

---

## Prinsip kerja

1. Satu fase = satu commit yang deploy-able (`./scripts/deploy.sh`), tidak menunggu fase lain.
2. Migrasi DB ditulis sebagai file di `migrations/` dan dijalankan manual (`psql "$SOCIAL_DATABASE_URL" -f ...`).
3. Setiap fase punya **bukti uji** yang harus dijalankan sebelum lanjut (skrip di `/tmp`, tidak masuk repo).
4. Tidak ada perubahan desain besar; UI mengikuti gaya flat yang sudah ada (`src/components/scanlator/ui.tsx`).
5. Build wajib staging (`./scripts/deploy.sh`) + commit + push seperti kebiasaan proyek ini.

---

# FASE W — Konversi gambar ke WebP

**Tujuan:** semua gambar chapter/cover/avatar yang diunggah Scanlator disimpan sebagai WebP ≤ 2000 px sisi terpanjang, kualitas 0.82. Target penurunan ukuran 40–70% dibanding JPG/PNG asli.

### Task W1: Util konversi di sisi klien

**File baru:** `src/utils/toWebp.ts`

```ts
export async function toWebp(file: File, opts?: { maxSide?: number; quality?: number }): Promise<File> {
  const maxSide = opts?.maxSide ?? 2000;
  const quality = opts?.quality ?? 0.82;
  if (typeof document === "undefined") return file;
  if (file.type === "image/gif" || file.type === "image/webp" && file.size < 400_000) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
  if (!blob || blob.size >= file.size) return file; // hasil lebih besar → pakai asli
  const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], name, { type: "image/webp" });
}
```

**Catatan:** GIF tidak dikonversi (animasi hilang). WebP < 400 KB dilewatkan agar tidak turun kualitas tanpa manfaat.

### Task W2: Pakai di alur upload studio

**File:** `src/app/scanlator/ScanlatorStudio.tsx`

- Di `uploadBatch`, sebelum memanggil `presign`:
  ```ts
  const prepared = await toWebp(file);
  ```
- Kirim `size: prepared.size`, `contentType: prepared.type`, `filename: prepared.name` ke `presign-upload`.
- `PUT` ke URL presign memakai `prepared`.
- Progress bar memakai `prepared.size` untuk hitungan "hemat".
- Fallback jalur server (`/api/scanlator/upload-image`) juga mengirim `prepared`.

**Kenapa di klien:** file tidak perlu naik-turun server, hemat waktu & CPU VPS (RAM VPS tipis).

### Task W3: Jaring pengaman di server

**File:** `src/app/api/scanlator/upload-image/route.ts` (jalur fallback)

- Jika `contentType` bukan `image/webp`, konversi pakai `sharp` **hanya untuk file ≤ 8 MB**; di atas itu tolak dengan pesan "konversi gagal, unggah ulang".
- Pertahankan watermark halaman terakhir (sudah ada) **setelah** konversi.

**Dependensi:** `sharp` (cek apakah sudah ada di `package.json`; kalau belum, `npm i sharp`).

### Verifikasi Fase W

| Uji | Harapan |
|---|---|
| Upload JPG 3 MB | file di R2 berekstensi `.webp`, ukuran turun ≥ 40% |
| Upload PNG 6 MB (screenshot) | WebP, sisi terpanjang ≤ 2000 px |
| Upload WebP 300 KB | tidak diubah (ukuran sama) |
| Upload GIF | dilewatkan apa adanya |
| Baca chapter | gambar tampil normal, tidak pecah |

**Risiko:** `createImageBitmap` tidak ada di Safari lama → sudah ada fallback `return file`, jadi unggahan tetap jalan (hanya tidak terkonversi).

---

# FASE 1 — Edit chapter terbit wajib re-review

**Tujuan:** perubahan isi chapter yang sudah terbit tidak langsung tayang.

### Task 1.1: Migrasi kolom revisi

**File baru:** `migrations/20261106_scanlator_chapter_review.sql`

```sql
alter table project_chapters add column if not exists review_status text not null default 'approved';
alter table project_chapters add column if not exists review_note text;
alter table project_chapters add column if not exists review_requested_at timestamptz;
create index if not exists project_chapters_review_idx on project_chapters (review_status);
```

### Task 1.2: PATCH chapter → minta review ulang

**File:** `src/app/api/scanlator/series/[slug]/chapter/[chapterId]/route.ts`

- Jika `image_urls` dikirim **dan** chapter `is_published = true`:
  - `patch.review_status = "pending"`, `patch.review_requested_at = now()`
  - **jangan** ubah `is_published` (pembaca lama tetap bisa baca versi tersimpan sampai admin memutuskan) — alternatif: simpan gambar baru di `pending_image_urls` (lihat 1.3).
- Respons: `{ success: true, reviewRequired: true }` → Studio menampilkan "Perubahan menunggu ACC, versi lama tetap tayang."

### Task 1.3 (pilihan aman): simpan versi baru terpisah

**Keputusan yang harus diambil user.** Dua opsi:

- **A. Ganti langsung + status pending** (sederhana): gambar langsung berubah, tapi chapter ditandai pending sampai di-ACC. Risiko: konten baru sudah tayang sebelum ACC.
- **B. `pending_image_urls`** (aman): gambar baru disimpan terpisah, pembaca tetap melihat versi lama sampai admin menyetujui. Perlu kolom tambahan + preview admin.

**Rekomendasi: B.** Migrasi tambahan:
```sql
alter table project_chapters add column if not exists pending_image_urls jsonb;
```

### Task 1.4: Admin review menampilkan revisi

**File:** `src/app/api/admin/scanlator/review/route.ts` + `src/components/dashboard/ScanlatorTab.tsx`

- Chapter dengan `review_status = 'pending'` muncul dengan label **"Revisi"** dan tombol **Setujui revisi / Tolak revisi**.
- Setujui: `image_urls = pending_image_urls`, `pending_image_urls = null`, `review_status = 'approved'`.
- Tolak: `pending_image_urls = null`, `review_status = 'approved'`, alasan dikirim ke notifikasi.

### Verifikasi Fase 1

| Uji | Harapan |
|---|---|
| Scanlator edit halaman chapter terbit | tersimpan sebagai revisi, pembaca masih lihat versi lama |
| Admin buka tab Karya | chapter muncul "Revisi" |
| Setujui revisi | gambar baru tayang, status approved |
| Tolak revisi | gambar lama tetap, Scanlator dapat alasan |

---

# FASE 3 — Kuota terkunci di hulu

**Tujuan:** total upload tidak bisa melewati 2 GB walau request diparalelkan.

### Task 3.1: Tabel reservasi

`migrations/20261106_scanlator_quota_reservation.sql`

```sql
create table if not exists scanlator_uploads (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  object_key text not null,
  bytes bigint not null,
  status text not null default 'reserved', -- reserved | committed | expired
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);
create index if not exists scanlator_uploads_handle_idx on scanlator_uploads (handle, status);
```

### Task 3.2: Presign memesan kuota

**File:** `src/app/api/scanlator/presign-upload/route.ts`

- Hitung `reserved = sum(bytes) where handle=$1 and status='reserved' and expires_at > now()`.
- Tolak jika `usage.usedBytes + reserved + size > QUOTA`.
- Insert baris `reserved` dengan `object_key` hasil presign.

### Task 3.3: Commit / expire

- Setelah `PUT` sukses, klien memanggil `POST /api/scanlator/upload-commit` dengan `object_key`.
- Route baru menandai `status='committed'` (atau hapus baris — usage tetap dihitung dari R2).
- Cron/saat presign berikutnya: baris `reserved` yang `expires_at < now()` ditandai `expired`.

### Verifikasi Fase 3

| Uji | Harapan |
|---|---|
| Presign 3 file @ 800 MB (di atas kuota) | hanya yang muat diloloskan, sisanya 413 |
| Presign 10 file kecil paralel hingga mendekati batas | total ≤ 2 GB, tidak bisa lewat |
| Reservasi kedaluwarsa | slot kembali setelah 30 menit |

---

# FASE 4 — Handle terlarang & verifikasi tim

### Task 4.1: Daftar handle terlarang

**File baru:** `src/lib/scanlatorReserved.ts`

```ts
export const RESERVED_HANDLES = new Set([
  "admin","ryukomik","support","official","staff","moderator",
  "ryu","ryu-scanlation","ryu-scan","kanimenia","shueisha","kodansha",
  "viz","mangakas","scanlator","komunitas","premium",
]);
export function isReservedHandle(h: string) {
  const v = h.toLowerCase();
  return RESERVED_HANDLES.has(v) || v.startsWith("ryukomik") || v.startsWith("admin");
}
```

Dipakai di `src/app/api/scanlator/apply/route.ts` (tolak 400 dengan pesan jelas) dan di ACC admin (peringatan).

### Task 4.2: Tanda terverifikasi

`migrations/20261106_scanlator_verified.sql`
```sql
alter table scanlator_profiles add column if not exists verified boolean not null default false;
```

- Badge **Terverifikasi** di profil grup + direktori (ikon centang, warna `var(--accent-2)`).
- Toggle di tab Scanlator admin: `POST /api/admin/scanlator` action `verify` / `unverify` + catat di `scanlator_moderation`.

### Task 4.3: Pernyataan hak unggah

- Di form upload chapter & form project: checkbox wajib **"Saya penerjemah karya ini atau punya izin dari pemegang hak"**.
- Disimpan `rights_confirmed_at timestamptz` pada `project_manga` (migrasi kecil) untuk bukti.

### Verifikasi Fase 4

| Uji | Harapan |
|---|---|
| Ajukan handle `admin` / `ryukomik-official` | ditolak 400 |
| Ajukan handle `ryu-scanlation` | ditolak, pesan "nama dilindungi" |
| Admin verifikasi tim | badge muncul di profil & direktori |
| Upload tanpa centang hak | tombol upload disabled |

---

# FASE 7 — Riwayat revisi & audit

### Task 7.1: Tabel revisi

`migrations/20261106_scanlator_chapter_revisions.sql`

```sql
create table if not exists scanlator_chapter_revisions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null,
  manga_slug text not null,
  actor_id uuid not null,
  action text not null,          -- create | edit_pages | edit_title | approve | reject | delete
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists scr_chapter_idx on scanlator_chapter_revisions (chapter_id, created_at desc);
```

### Task 7.2: Catat setiap perubahan

- Helper `src/lib/scanlatorAudit.ts` → `logChapterRevision({...})`.
- Dipanggil di: PATCH chapter (title/pages), ACC/Tolak chapter (admin), DELETE chapter.

### Task 7.3: Panel riwayat di Studio & admin

- Studio: tab Chapter → tombol **Riwayat** per chapter (10 revisi terakhir: waktu, aksi, jumlah halaman).
- Admin: di daftar chapter, tampilkan "3 revisi · terakhir 2 jam lalu" dengan tautan detail.

**Retensi:** simpan 90 hari; cron harian hapus yang lebih lama.

### Verifikasi Fase 7

| Uji | Harapan |
|---|---|
| Edit halaman | 1 baris revisi `edit_pages` dengan before/after |
| ACC revisi | baris `approve` dengan actor admin |
| Hapus chapter | baris `delete` tetap ada walau chapter hilang |

---

# FASE 8 — Follow grup & notifikasi chapter baru

### Task 8.1: Tabel follow

```sql
create table if not exists scanlator_follows (
  user_id uuid not null references auth_users(id) on delete cascade,
  handle text not null,
  created_at timestamptz not null default now(),
  notify boolean not null default true,
  primary key (user_id, handle)
);
create index if not exists scanlator_follows_handle_idx on scanlator_follows (handle);
```

### Task 8.2: API follow

- `POST /api/scanlator/follow` body `{ handle, follow: boolean }` (butuh login).
- `GET /api/scanlator/follow?handle=` → status untuk tombol.
- Tombol **Ikuti** di profil grup (di samping nama), gaya outline flat.

### Task 8.3: Notifikasi saat chapter terbit

- Kirim saat **admin meng-ACC chapter** (bukan saat upload) — supaya tidak ada notifikasi untuk konten yang belum tayang.
- Sumber data: `scanlator_follows` → `scanlator_notifications` (in-app) untuk semua follower + push web jika user punya subscription push.
- Batch insert agar tidak N+1; batasi 5.000 follower per chapter.

### Task 8.4: Halaman "Diikuti"

- Tab baru? **Tidak.** Cukup filter di halaman Scanlator Komunitas: chip "Diikuti" di atas daftar grup.

### Verifikasi Fase 8

| Uji | Harapan |
|---|---|
| Klik Ikuti | baris di `scanlator_follows`, tombol jadi "Diikuti" |
| Admin ACC chapter | follower dapat 1 notifikasi, non-follower tidak |
| Unfollow | tidak dapat notifikasi berikutnya |

---

# FASE 9 — SEO & OG grup

### Task 9.1: Metadata dinamis

**File:** `src/app/scanlator/[handle]/page.tsx`

```ts
export async function generateMetadata({ params }) {
  const p = await getScanlatorProfileByHandle(params.handle); // helper server-side (read-only)
  if (!p) return { title: "Scanlator tidak ditemukan" };
  return {
    title: `${p.team_name} (@${p.handle}) — Scanlator`,
    description: p.bio || `Karya terjemahan ${p.team_name} di Ryukomik.`,
    openGraph: {
      title: `${p.team_name} — Scanlator`,
      description: p.bio || undefined,
      images: p.avatar_url ? [{ url: p.avatar_url }] : undefined,
      type: "profile",
    },
    alternates: { canonical: `https://ryukomik.my.id/scanlator/${p.handle}` },
  };
}
```

### Task 9.2: Sitemap

**File:** `src/app/sitemap.ts`
- Tambahkan entri `/scanlator/<handle>` (prioritas 0.6) dan `/scanlator/direktori` (0.5).
- Sumber: query `scanlator_profiles where status <> 'revoked'`, cache 1 jam.

### Task 9.3: Structured data

- JSON-LD `ProfilePage` + `Organization` (nama, logo, url) di halaman grup.

### Verifikasi Fase 9

| Uji | Harapan |
|---|---|
| `curl -s page | grep og:title` | berisi nama tim |
| Bagikan link di WhatsApp | preview menampilkan nama + avatar |
| `/sitemap.xml` | memuat seluruh handle aktif |
| Rich Results Test | ProfilePage valid |

---

# FASE 10 — Statistik per chapter di Studio

### Task 10.1: API statistik chapter

**File baru:** `src/app/api/scanlator/chapter-stats/route.ts`
- Verifikasi sesi Scanlator + kepemilikan seri.
- Ambil `chapter-views` dari project DB (`/projects/:slug/chapter-views`) lalu gabungkan dengan daftar chapter (judul, jumlah halaman).
- Respons: `[{ chapter_number, title, pages, views }]` urut views desc.

### Task 10.2: Tampilan

- Studio → Project → tab **Chapter**: tiap baris menampilkan `👁 1.2 rb` di kanan.
- Tab Ringkasan: tambah kartu **"Chapter terpopuler"** (1 baris, judul + views).

### Verifikasi Fase 10

| Uji | Harapan |
|---|---|
| Buka tab Chapter | views tiap chapter tampil |
| Baca 3× chapter 2.1 | angka naik setelah refresh |
| Chapter belum terbit | views 0, label "belum terbit" |

---

## Urutan eksekusi yang disarankan

1. **Fase W (WebP)** — menyentuh jalur upload; kerjakan sebelum reservasi kuota supaya ukuran file sudah final.
2. **Fase 1 (re-review)** — risiko konten paling tinggi.
3. **Fase 3 (kuota)** — mudah, cepat, mencegah storage jebol.
4. **Fase 4 (handle & verifikasi)** — butuh keputusan daftar nama terlarang.
5. **Fase 7 (audit)** — pondasi untuk sengketa; setelah 1 & 3 stabil.
6. **Fase 8 (follow & notif)** — fitur pertumbuhan, tidak urgent keamanan.
7. **Fase 9 (SEO)** — cepat, tanpa risiko.
8. **Fase 10 (statistik)** — terakhir, murni kenyamanan tim.

---

## Keputusan yang perlu user jawab sebelum mulai

1. **Fase 1**: pakai opsi **A** (ganti gambar langsung + status pending) atau **B** (`pending_image_urls`, versi lama tetap tayang)? Rekomendasi **B**.
2. **Fase W**: kualitas WebP **0.82** dan batas **2000 px** — oke, atau mau lebih kecil (1600 px / 0.78) demi hemat R2?
3. **Fase W**: GIF animasi — dilewatkan (rekomendasi) atau ditolak?
4. **Fase 4**: daftar nama terlarang — cukup contoh di plan, atau kamu mau tambahkan nama penerbit/agensi tertentu?
5. **Fase 8**: notifikasi hanya in-app, atau sekalian push web (biaya kuota push naik)?

---

## Risiko umum

- **Ketergantungan `sharp`** di VPS RAM 4.5G — hanya dipakai jalur fallback, file ≤ 8 MB, dan dijalankan serial per request.
- **Migrasi DB** harus dijalankan sebelum deploy kode yang memakai kolom baru; urutan: migrasi → deploy.
- **Fase 8** bisa membengkakkan `scanlator_notifications`; tambahkan index `(user_id, created_at desc)` bila belum ada dan retensi 60 hari.
- Semua fase mengikuti aturan proyek: build staging (`./scripts/deploy.sh`), commit + push, dan verifikasi live sebelum lanjut fase berikutnya.
