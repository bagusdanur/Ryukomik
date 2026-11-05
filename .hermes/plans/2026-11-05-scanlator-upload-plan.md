# Plan: Scanlator — User Upload Hasil TL di Ryukomik

Tanggal: 2026-11-05
Status: KONSEP / CONTOH (belum dikerjakan)
Nama resmi fitur: **Scanlator** (badge profil: Scanlator, Tim TL adalah sebutan komunitas)
Referensi konsep: **holodek.run/comic** (HoloToon)

---

## 1. Ringkasan ide

Platform komik terbuka seperti HoloToon: pengguna tidak hanya membaca, tapi bisa
**mengunggah hasil terjemahan (TL/scanlation) mereka** sendiri. Setiap seri menampilkan
atribusi **"Diunggah oleh <Scanlator>"** + tautan ke profil Scanlator-nya, persis pola
HoloToon (`Uploaded by: moccacinno`).

Di Ryukomik, 80% mesinnya sudah ada:
- **Project source** (`project-db` :4100, `is_adult`, premium lock, image-guard)
- Upload cover/chapter ke R2 (`/api/admin/project/upload-image`)
- Dashboard admin (review, lock, request premium)
- Notifikasi Telegram (`@RyukomikPremiumbot`, ACC/Tolak dari bot)
- Auth lokal + role (`social_profiles.role`) — tinggal tambah role `scanlator`
- Komentar, bookmark, favorit, push chapter

Yang dibangun baru: **lapisan kepemilikan user** (siapa pemilik seri/chapter),
**antrean review untuk upload user**, **saldo & monetisasi Scanlator**, dan
**atribusi di semua tampilan**.

## 2. Konsep dari HoloToon yang diadopsi (dan yang tidak)

Diadopsi:
- Atribusi uploader di judul + tiap chapter ("Uploaded by X", kartu komentar X).
- Halaman profil per uploader (`/profile/<username>`).
- Rating per seri (9.6/10) + views + status (ongoing/completed) + genre chips.
- Daftar chapter dengan judul chapter buatan uploader ("Chapter 44 — dokter kamu jangan macem-macem ya").
- **Tautan dukungan eksternal per kreator** (DANA/GOPAY, Tako, Trakteer) — ini yang
  membuat model HoloToon hidup tanpa payment gateway.
- Form Report (bug / konten bermasalah / saran) — juga jadi jalur DMCA sederhana.
- 18+ gate di halaman detail ("Saya 18+, Lanjutkan").

Tidak diadopsi (dulu):
- Voting karakter Green/Red Flag + thread komunitas penuh — fitur terpisah, bisa menyusul.
- Download app — Ryukomik sudah punya APK sendiri.

## 3. Peran & hak akses

| Peran | Cara dapat | Hak |
|---|---|---|
| User biasa | default | Baca, bookmark, komentar |
| **Scanlator** | Apply (form + contoh hasil TL) → admin setujui | Upload seri/chapter (status review), lihat saldo, atur tautan dukungan, lihat statistik karyanya |
| Admin | existing | Review semua upload, edit/hapus paksa, atur flag 18+, ACC pencairan |

Role disimpan di `social_profiles.role = 'scanlator'` (nilai baru, bersama
`user`/`admin`/`staff` yang sudah ada).

## 4. Alur kerja (flow)

### 4.1 Apply jadi Scanlator
- Halaman `/scanlator/daftar`: nama tim/handle, deskripsi, 1–3 contoh hasil TL (link/unggah),
  pernyataan orisinalitas + persetujuan aturan.
- Masuk antrean dashboard admin. Admin setujui → role jadi `scanlator`,
  notifikasi Telegram ke admin + pesan ke user.

### 4.2 Upload seri
- Form: judul, slug otomatis, cover, deskripsi, genre, type (manhwa/manga/manhua/novel),
  status, `is_adult` (toggle 18+ — satu-satunya penentu filter, sesuai keputusan terakhir).
- Status awal: **menunggu review**. Tidak tampil di publik sampai ACC.

### 4.3 Upload chapter
- Per chapter: nomor, judul bebas (gaya HoloToon), gambar (1 file ZIP atau banyak JPG/PNG),
  ukuran maks **30 MB/chapter**, kuota Scanlator **2 GB** (bisa dinaikkan admin).
- Gambar dikompresi otomatis (sharp) + watermark kecil nama Scanlator di halaman terakhir.
- Status per chapter: menunggu review → terbit. Chapter yang sudah terbit tidak bisa
  diedit isinya (hanya judul), untuk anti tukar-tukar diam-diam.

### 4.4 Review admin
- Antrean di dashboard: preview judul/cover, jumlah halaman, ukuran, riwayat Scanlator.
- **ACC** → terbit, notifikasi Telegram ke Scanlator ("Chapter X disetujui").
- **Tolak** → wajib catatan; Scanlator bisa perbaiki & ajukan ulang.
- Admin bisa **cabut akses Scanlator** (role turun) tanpa menghapus karyanya.

### 4.5 Tampil di publik
- Kartu & detail menampilkan atribusi: **"Diunggah oleh <Scanlator>"** + badge terverifikasi.
- Halaman profil Scanlator: daftar karyanya, total views, rating rata-rata, tautan dukungan.
- Chapter premium: Scanlator memilih **gratis / lock premium** per chapter
  (pakai `premium_lock_until` yang sudah ada; pola umum: 3 chapter pertama gratis).

## 5. Sistem monetisasi (inti kebingungan — diputuskan bertahap)

### Tahap 1 — MVP (tanpa uang masuk Scanlator)
- Scanlator pasang **tautan dukungan eksternal sendiri** (DANA/GOPAY, Trakteer, Tako —
  pola HoloToon). Uang langsung ke Scanlator, Ryukomik tidak pegang dana.
- Chapter semua gratis. Tujuan: buktikan ada yang mau upload.

### Tahap 2 — Tips di platform
- Tombol "Dukung Scanlator" di akhir chapter → user pilih nominal → **saldo Scanlator**
  bertambah (dicatat di `scanlator_transactions`, tidak bisa diedit).
- Pembayaran tetap manual: user kirim bukti TF seperti premium sekarang,
  admin ACC dari dashboard/Telegram.
- Scanlator ajukan **pencairan** (saldo ≥ Rp 25.000) → admin transfer → tandai lunas.
- Semua mutasi tercatat (siapa, kapan, nominal, bukti) — audit trail wajib.

### Tahap 3 — Revenue share premium
- Chapter premium Scanlator terjual lewat sistem premium yang ada →
  **70% Scanlator / 30% Ryukomik** masuk saldo Scanlator otomatis saat ACC premium.
- Laporan per seri di dashboard Scanlator: views, unlock, estimasi saldo.

### Yang TIDAK dipakai
- Iklan per-halaman (Quick Ads belum per-halaman).
- Upload berbayar (membunuh semangat kontribusi).
- Koin multi-mata uang (satu saldo Rupiah cukup).

### Angka awal yang disarankan
- Saldo minimum pencairan: **Rp 25.000**
- Share: **70/30** (Scanlator/Ryukomik)
- Kuota storage awal: **2 GB / Scanlator**, maks **30 MB / chapter**, maks **200 halaman / chapter**
- Watermark: nama Scanlator, halaman terakhir saja (ringan, tidak merusak baca)

## 6. Keamanan & penyalahgunaan (prioritas)

- **Hak cipta**: checkbox pernyataan orisinalitas saat apply + form Report jadi jalur
  takedown; hapus < 24 jam kalau ada komplain pemilik hak. Ini syarat wajib sebelum launch.
- **Anti spam/bajakan**: cek duplikat slug & judul mirip; 1 Scanlator = 1 akun aktif;
  rate-limit upload (mis. 5 chapter/jam).
- **File upload**: validasi magic bytes gambar (bukan cuma ekstensi), tolak SVG/script,
  scan ukuran sebelum masuk R2, simpan di prefix `scanlator/<user_id>/`.
- **Token upload**: presigned URL berumur 15 menit via route admin yang sudah ada,
  diperluas untuk role scanlator dengan hak hanya ke prefix miliknya.
- **Saldo**: tidak ada endpoint yang boleh mengubah saldo selain transaksi tercatat;
  pencairan wajib ACC admin (webhook Telegram bisa dipakai ulang).

## 7. Data (tabel baru, Postgres sosial yang sama)

| Tabel | Isi |
|---|---|
| `scanlator_applications` | Pengajuan jadi Scanlator: user_id, handle, deskripsi, contoh, status, catatan admin |
| `scanlator_profiles` | Profil publik Scanlator: bio, tautan dukungan (dana/trakteer/tako), total views |
| `scanlator_balance` | Saldo per Scanlator (satu baris per user) |
| `scanlator_transactions` | Semua mutasi: tips, share premium, pencairan, penyesuaian admin |
| Kolom baru di project | `owner_user_id` (pemilik seri), `review_status` (pending/approved/rejected), `review_note` |

Project milik admin lama: `owner_user_id = null` (dianggap milik platform).

## 8. Fase pengerjaan yang diusulkan

- **Fase A — Identitas & apply**: role `scanlator`, halaman apply, antrean ACC di dashboard, badge profil.
- **Fase B — Upload + review**: form seri/chapter untuk Scanlator, status review, atribusi "Diunggah oleh" di kartu/detail/chapter, halaman profil Scanlator, watermark + kompresi.
- **Fase C — Dukungan eksternal**: tautan DANA/Trakteer/Tako di profil & halaman detail (pola HoloToon). Ini titik "monetisasi pertama" tanpa pegang uang.
- **Fase D — Tips + saldo**: tabel saldo/transaksi, tombol tips, ACC bukti TF (pakai ulang alur premium + Telegram), pengajuan pencairan.
- **Fase E — Revenue share premium**: share otomatis 70/30 saat ACC premium, laporan per seri.
- **Fase F — Pengerasan**: kuota & rate-limit, anti-duplikat, jalur takedown/DMCA, audit log.

Setiap fase: staging build + deploy terpisah, commit + push (aturan tetap), uji end-to-end (apply → upload → review → terbit → tips → cair).

## 9. Risiko & keputusan terbuka

1. **Hak cipta adalah risiko terbesar** — putuskan dulu: platform terbuka penuh (risiko
   DMCA) atau kurasi ketat (hanya seri yang dinyatakan orisinal/remake)? Rekomendasi: kurasi ketat di awal.
2. **Siapa yang pegang uang** — Tahap 1 sengaja tidak pegang uang sama sekali (eksternal),
   supaya legal & operasionalnya ringan. Saldo platform baru di Fase D.
3. **Biaya storage** — estimasi kasar: 100 chapter × 15 MB = 1,5 GB; awasi kuota, jangan biarkan tanpa batas.
4. **Komunitas** (thread, voting karakter ala HoloToon) — sengaja di luar plan ini; bisa jadi Fase G kalau Scanlator sudah jalan.

## 10. Definisi selesai (MVP = Fase A–C)

- User bisa apply → admin ACC → upload seri + chapter → review → terbit.
- Publik melihat atribusi Scanlator di kartu, detail, dan tiap chapter.
- Scanlator punya halaman profil dengan tautan dukungan eksternal.
- Tidak ada regresi: source lain, premium, dan filter 18+ tetap jalan seperti sekarang.

## Catatan keputusan (2026-11-05, dari user)
- Notifikasi chapter baru **hanya untuk komik yang di-BOOKMARK** user.
  Riwayat baca TIDAK menerima push (sekali baca ≠ mau dapat notifikasi).
  (Sebelumnya sempat digabung bookmark+riwayat — sudah dikembalikan ke bookmark-only.)
- Filter 18+ Project: hanya flag `is_adult` dari toggle dashboard Project yang menentukan.
