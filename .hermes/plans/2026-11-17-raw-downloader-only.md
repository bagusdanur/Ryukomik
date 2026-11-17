# RAW Downloader untuk Scanlator — Plan Final (khusus fitur ini)

**Lingkup:** HANYA downloader RAW. Tanpa OCR, tanpa arsip, tanpa fitur lain.
**Tujuan:** scanlator terpilih bisa mencari seri di sumber RAW, memilih chapter, lalu mengunduhnya
sebagai ZIP — langsung dari Dashboard Scanlator. Admin yang menentukan siapa yang boleh.

---

## 1. Alur pengguna (yang akan dilihat scanlator)

```
Dashboard Scanlator
  └─ tab "RAW"            ← hanya muncul kalau akun itu diizinkan admin
       ├─ pilih sumber    : Asura / Demon / Vortex / Qimanga / ...
       ├─ cari seri       : ketik judul → daftar hasil + cover
       ├─ pilih seri      : daftar chapter (urut dari lama ke baru)
       ├─ centang chapter : boleh 1 atau beberapa
       └─ [Unduh RAW]     : ZIP langsung terunduh ke perangkat
                            isi: 001.webp, 002.webp, ... sesuai urutan halaman
```

Yang **tidak** ada di versi ini:
- tidak ada OCR
- tidak ada penyimpanan RAW di server/R2
- tidak ada "kirim langsung ke upload chapter"
- tidak ada akses publik — URL unduhan butuh sesi login

---

## 2. Alur admin

```
Dashboard → tab Scanlator → daftar scanlator aktif
   [ RAW: mati/hidup ]   batas/hari: [5]   [Simpan]
```

Sakelar ini per akun. Bawaannya **mati semua**, jadi tidak ada yang bisa memakai sebelum
kamu nyalakan sendiri.

---

## 3. Teknis

### Database (SUDAH dijalankan)

```sql
alter table scanlator_profiles
  add column raw_access boolean not null default false,
  add column raw_daily_limit integer not null default 5;

create table scanlator_raw_downloads (
  id bigserial primary key,
  user_id uuid, handle text, source text,
  series_slug text, series_title text,
  chapter_slug text, chapter_title text,
  images integer, bytes bigint,
  created_at timestamptz default now()
);
```

Tabel unduhan dipakai untuk batas harian **dan** jejak audit (siapa mengunduh apa, kapan).

### Endpoint (SUDAH dibuat, belum dipakai UI)

```
GET /api/scanlator/raw/search?source=asura&q=judul
GET /api/scanlator/raw/series?source=asura&slug=judul-seri
GET /api/scanlator/raw/download?source=asura&slug=judul-seri&chapter=chapter-24
```

Semua memeriksa: sesi login → status scanlator aktif → `raw_access = true`.
Download juga memeriksa batas harian dan mencatat ke tabel audit.

### Sumber data

Memakai jembatan yang sudah dipakai RyukomikBot (`api.ryukomik.com/<sumber>/...`).
Diuji hari ini: Asura, Demon, Vortex, Qimanga hidup. Omega menjawab tapi tanpa hasil.

### Tanpa penyimpanan

Gambar diambil di server, dibungkus ZIP di memori, lalu dikirim ke perangkat. Setelah itu
memori dilepas — tidak ada file tertinggal di disk atau R2. Ini menghindari biaya storage
dan risiko RAW menumpuk.

Batas pengaman: maks 150 gambar, maks 250 MB per chapter, 4 gambar diunduh paralel.

---

## 4. Status pekerjaan saat ini

| Bagian | Status |
|---|---|
| Kolom DB `raw_access`, `raw_daily_limit` | sudah dijalankan |
| Tabel `scanlator_raw_downloads` | sudah dijalankan |
| Logika izin (`src/lib/scanlatorRaw.ts`) | sudah ditulis |
| 3 endpoint API RAW | sudah ditulis |
| Sakelar di dashboard admin | **belum** |
| Tab RAW di studio | **belum** |
| Deploy | **belum** |

Artinya: **belum ada yang berubah bagi pengguna.** Fitur belum bisa dipakai siapa pun —
tidak ada tombol, dan semua akun masih `raw_access = false`. Kalau kamu mau, bagian yang sudah
ada pun bisa dibatalkan (kolom dan tabel tinggal di-drop).

---

## 5. Sisa pekerjaan kalau disetujui

| Langkah | Isi | Ukuran |
|---|---|---|
| 1 | Endpoint admin: baca kolom baru + aksi `toggle-raw` | kecil |
| 2 | UI admin: sakelar per scanlator di tab Scanlator | sedang |
| 3 | UI studio: tab RAW (cari → seri → chapter → unduh) | besar |
| 4 | `tsc`, deploy, uji dengan akun yang diizinkan | sedang |

Perkiraan: satu sesi kerja penuh untuk langkah 1–4.

---

## 6. Keputusan yang saya butuhkan sebelum lanjut

1. **ZIP langsung ke perangkat, tanpa simpan di server** — setuju? (ini yang saya sarankan:
   tanpa biaya storage, tanpa RAW menumpuk, tanpa risiko tautan bocor)
2. **Batas harian 5 chapter/akun** — cocok, atau angka lain?
3. **Sumber mana yang ditampilkan?** Semua 16 (yang gagal akan tampil error), atau hanya yang
   terbukti hidup: Asura, Demon, Vortex, Qimanga?
4. **Siapa yang dapat akses pertama?** Sebut handle-nya, atau saya biarkan mati semua dan
   kamu nyalakan sendiri dari admin setelah fitur terpasang.

---

## 7. Yang sengaja tidak dikerjakan

- OCR / ekstraksi teks
- Menyimpan RAW sebagai arsip
- Menerbitkan chapter langsung dari RAW
- Menampilkan RAW ke pembaca umum
