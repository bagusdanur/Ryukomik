# RAW Downloader + OCR Extractor untuk Scanlator

**Status:** rancangan, belum ada kode yang diubah.
**Tujuan:** memberi scanlator terpilih akses mengunduh RAW chapter dan mengekstrak teksnya
langsung dari Dashboard Scanlator, dengan kontrol akses per-akun yang diatur admin.

---

## 1. Yang sudah ada (hasil pemeriksaan)

### Sumber RAW
`RyukomikBot/raw_downloader/` punya **20 modul sumber**: asura, demon, doujiva, dusk, evascan,
kagane, ken, lagoon, lua, mangadex, mgeko, mgread, mist, omega, qimanga, thunder, vortex, dan lainnya.
Semuanya memanggil endpoint kita sendiri di `api.ryukomik.com/<sumber>/...`, bukan langsung ke situs asal.

Diuji dari VPS hari ini:

```
asura     200  success:true  totalItems 11
demon     200  success:true
vortex    200  success:true  totalItems 7
qimanga   200  success:true  totalItems 81
omega     200  success:true  totalItems 0   (tidak ada hasil untuk "solo")
```

Artinya **jembatan ke sumber RAW sudah hidup di server yang sama** — tidak perlu membangun
fetcher baru dari nol, cukup memakai endpoint yang sudah dipakai bot.

### OCR
`ryukomik-auto-comic-translator` sudah memakai **PaddleOCR** (254 rujukan) dan **RapidOCR** (30),
dan service-nya hidup di port **3210** dengan endpoint antara lain:

```
/pages/analyze     (analisis halaman -> teks + koordinat)
/pages/detect
/pages/preprocess
/health            401 tanpa auth (service hidup)
```

Jadi mesin OCR sudah terpasang dan terpakai produksi — tidak perlu memasang dependensi baru.

### Dashboard
- Studio scanlator: `src/app/scanlator/ScanlatorStudio.tsx` (tab Ringkasan, Project, Profil)
- Admin scanlator: `src/components/dashboard/ScanlatorTab.tsx` (baru menangani pengajuan pending)
- Tabel `scanlator_profiles` **belum punya kolom fitur**:

```
user_id, handle, team_name, bio, support_*, contact_*, status,
warnings, suspended_until, moderation_note, avatar_url, verified, storage_handle
```

---

## 2. Rancangan akses per-scanlator

### Perubahan database

```sql
alter table scanlator_profiles
  add column raw_access boolean not null default false,
  add column raw_daily_limit integer not null default 3,
  add column ocr_access boolean not null default false,
  add column features_note text;
```

Alasan kolom terpisah, bukan satu kolom `features jsonb`: mudah di-query, mudah ditampilkan
di admin, dan tidak perlu parsing saat cek izin.

### Penegakan izin

- Setiap route API baru memanggil satu helper `requireScanlatorCapability(userId, "raw" | "ocr")`
  yang membaca `scanlator_profiles.status = 'active'` **dan** flag terkait.
- Client (studio) hanya menyembunyikan tab; izin sebenarnya selalu dicek di server — jangan
  pernah mengandalkan UI.
- Admin bisa mencabut kapan saja; efeknya langsung pada request berikutnya (tanpa cache).

### UI admin

Di `ScanlatorTab`, tambah panel "Scanlator aktif" berisi daftar akun dengan dua sakelar:

```
Nama tim · @handle · status
[ RAW: mati/hidup ]  [ OCR: mati/hidup ]  batas harian: [3]
catatan: ____________  [Simpan]
```

Aksi ditulis ke tabel audit (lihat bagian 6) supaya jelas siapa mengaktifkan apa dan kapan.

---

## 3. Fitur A — RAW Downloader

### Alur pengguna

```
Tab "RAW" (hanya tampil kalau raw_access)
  ├─ pilih sumber      : Asura / Demon / Vortex / Qimanga / ...
  ├─ cari seri         : kotak pencarian -> hasil dari api.ryukomik.com/<sumber>/search
  ├─ pilih seri        : daftar chapter dari /detail/<id>
  ├─ centang chapter   : boleh lebih dari satu (dibatasi raw_daily_limit)
  └─ tombol "Unduh"    -> job berjalan di latar, progres per chapter
                          hasil: ZIP di storage + tombol "Simpan" dan "Kirim ke Upload Chapter"
```

### Proses di server

1. `POST /api/scanlator/raw/jobs` → buat baris job, kembalikan `jobId`.
2. Worker (proses PM2 baru, mis. `ryukomik-raw-worker`) mengambil job:
   - ambil daftar gambar chapter dari endpoint sumber
   - unduh paralel 4–6 gambar, simpan ke folder sementara
   - susun nama `001.webp`, `002.webp`, … (urutan sesuai sumber)
   - bungkus ZIP, unggah ke R2 di `scanlator/<handle>/raw/<seri>/<chapter>.zip`
   - hapus folder sementara
3. Studio menampilkan progres lewat polling `GET /api/scanlator/raw/jobs/<id>`.

### Keputusan penting: umur simpan

Satu chapter RAW berukuran **20–100 MB**. Kuota gambar kamu sekarang **9,5 GB dari 10 GB** di akun
utama, jadi menyimpan RAW permanen akan langsung menabrak batas.

Rancangan yang diusulkan:

- ZIP RAW **otomatis dihapus setelah 48 jam**, atau langsung setelah dipakai "Kirim ke Upload Chapter"
- RAW **tidak dihitung** dalam kuota gambar 10 GB; diberi jatah terpisah, mis. 2 GB per akun
- Kalau jatah penuh, job ditolak dengan pesan jelas

### Batasan

- Maksimal `raw_daily_limit` chapter per akun per hari (default 3)
- 1 job berjalan per akun (antrean, bukan paralel)
- Ukuran ZIP maksimal 150 MB; kalau lebih, chapter dipecah
- Sumber yang gagal (404/502 seperti `ken` dan `mgread` sekarang) ditandai "tidak tersedia"
  di UI, bukan dibiarkan menggantung

---

## 4. Fitur B — OCR Extractor

### Dua sumber masukan

```
1. Dari RAW yang baru diunduh (ZIP di R2)
2. Dari gambar chapter yang sudah terbit di project scanlator
```

### Alur

```
Tab "OCR" (hanya tampil kalau ocr_access)
  ├─ pilih sumber gambar : ZIP RAW / chapter project
  ├─ pilih bahasa        : Jepang, Korea, Mandarin, Inggris
  ├─ tombol "Ekstrak"    -> job berjalan
  └─ hasil per halaman   : teks + kotak deteksi
       unduh:  .txt per halaman  /  .json (teks + koordinat)  /  .csv
```

### Mesin

Memakai `translator-api` yang sudah ada (`/pages/analyze`), bukan memasang OCR baru:

- PaddleOCR untuk deteksi + pengenalan
- Hasil disimpan sebagai JSON per halaman di `scanlator/<handle>/ocr/<job>/`
- Estimasi kecepatan: 1–2 detik per halaman → chapter 30 halaman ≈ 1 menit

### Batasan

- Maksimal 40 halaman per job
- Antrean sama dengan RAW: 1 job per akun
- CPU: worker OCR **terpisah** dari worker penerjemah supaya tidak memperlambat antrean
  terjemahan yang sudah berjalan produksi

---

## 5. Biaya dan risiko

| Hal | Perkiraan | Catatan |
|---|---|---|
| Storage RAW | 20–100 MB/chapter | wajib auto-hapus 48 jam, jatah terpisah |
| Egress unduhan | 20–100 MB/chapter | lewat VPS lalu ke R2; hindari unduhan berulang |
| CPU OCR | 1–2 dtk/halaman | 3 chapter/hari ≈ 5 menit CPU |
| Legal | tinggi | RAW milik penerbit; jangan pernah tampil publik, jangan ada URL yang bisa dibagikan |
| Penyalahgunaan | sedang | batas harian + audit log wajib sejak hari pertama |

Risiko terbesar bukan teknis, tapi **kebocoran**: kalau URL ZIP RAW bisa diakses publik, itu
sama dengan mendistribusikan karya berhak cipta. ZIP harus di balik signed URL berumur pendek
(mis. 15 menit) dan tidak pernah muncul di halaman publik.

---

## 6. Audit dan pengawasan

```sql
create table scanlator_feature_events (
  id bigserial primary key,
  user_id uuid not null,
  feature text not null,          -- 'raw' | 'ocr'
  action text not null,           -- 'grant' | 'revoke' | 'use'
  detail jsonb,
  actor text,                     -- 'admin' | handle scanlator
  created_at timestamptz default now()
);
```

Yang dicatat: admin menyalakan/mematikan fitur, scanlator memakai fitur (sumber apa, seri apa,
berapa chapter), dan kegagalan job.

---

## 7. Tahapan pengerjaan

| Fase | Isi | Perkiraan |
|---|---|---|
| 1 | Kolom DB + helper izin + sakelar di admin + audit log | 1 sesi |
| 2 | RAW downloader: cari, pilih, unduh, ZIP, progres (sumber Asura dulu) | 2–3 sesi |
| 3 | "Kirim ke Upload Chapter" + auto-hapus 48 jam | 1 sesi |
| 4 | OCR extractor memakai translator-api + unduhan TXT/JSON | 1–2 sesi |
| 5 | Tambah sumber lain, batas kuota RAW terpisah, halaman riwayat | 1 sesi |

Fase 1 tidak menambah fitur apa pun ke scanlator — hanya menyiapkan izin dan sakelar, jadi aman
dikerjakan lebih dulu dan bisa diuji tanpa risiko.

---

## 8. Pertanyaan yang perlu kamu putuskan

1. **Simpan RAW di mana?** R2 dengan auto-hapus 48 jam (disarankan), atau langsung ke disk VPS
   lalu dihapus setelah diunduh pengguna?
2. **Boleh "Kirim ke Upload Chapter"?** Artinya RAW yang diunduh bisa langsung masuk ke form
   upload chapter tanpa diunduh dulu ke HP. Ini fitur paling nyaman, tapi membuat satu klik bisa
   menerbitkan chapter — perlu konfirmasi ganda.
3. **Sumber mana dulu?** Saran: Asura (paling stabil dari pengujian tadi), lalu Vortex dan Qimanga.
4. **Batas harian default?** Saran 3 chapter per akun per hari.
5. **Format OCR?** Saran: JSON dengan koordinat + TXT polos, keduanya bisa diunduh.
6. **Siapa yang dapat fitur ini pertama?** Sebutkan handle-nya, atau saya siapkan sakelar mati
   semua dan kamu nyalakan sendiri dari admin.

---

## 9. Yang TIDAK termasuk

- Menerjemahkan otomatis hasil OCR (itu pekerjaan translator yang sudah ada, dan sebaiknya
  dipisah supaya antreannya tidak saling mengganggu)
- Menyimpan RAW permanen sebagai arsip
- Menampilkan RAW ke pembaca umum dalam bentuk apa pun
