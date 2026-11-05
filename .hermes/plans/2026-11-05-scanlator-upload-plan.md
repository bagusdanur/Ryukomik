# Plan: Scanlator — User Upload Hasil TL di Ryukomik

Tanggal: 2026-11-05
Status: KONSEP / CONTOH (belum dikerjakan)
Keputusan monetisasi (2026-11-05): **sistem dulu, monetisasi sementara cukup link donate eksternal**.
Saldo/tips/revenue-share DICABUT dari MVP dan dipindah ke backlog (Fase Later).
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
**antrean review untuk upload user**, **link donate Scanlator**, dan
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
| **Scanlator** | Apply (form + contoh hasil TL) → admin setujui | Upload seri/chapter (status review), atur tautan donate, lihat statistik karyanya |
| Admin | existing | Review semua upload, edit/hapus paksa, atur flag 18+, ACC pencairan |

Role disimpan di `social_profiles.role = 'scanlator'` (nilai baru, bersama
`user`/`admin`/`staff` yang sudah ada).

## 4. Alur kerja (flow)

### 4.1 Akun Translation dulu (wajib, anti sembarangan)
- **Tahap 0:** user mengajukan **Apply Request Akun Translation** di `/scanlator/daftar`:
  nama tim/handle, deskripsi, 1–3 contoh hasil TL (link/unggah), pernyataan
  orisinalitas + persetujuan aturan.
- Masuk antrean dashboard admin. Admin setujui → **Akun Translation aktif**
  (role `scanlator` mulai berlaku), notifikasi Telegram ke admin + pesan ke user.
- Tanpa Akun Translation aktif: **tidak ada akses upload sama sekali**.
  User biasa tetap hanya membaca seperti sekarang.
- Setelah itu, setiap upload seri/chapter tetap lewat review per-item (Fase B).

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

## 5. Sistem monetisasi — diputuskan: link donate dulu

**Keputusan user (2026-11-05):** bangun sistemnya dulu. Monetisasi sementara
**hanya tautan donate eksternal per Scanlator** (DANA/GOPAY, Trakteer, Tako —
pola HoloToon). Uang langsung ke Scanlator, Ryukomik tidak pegang dana,
tidak ada saldo, tidak ada pencairan, tidak ada ACC pembayaran.

- Tempat tautan: halaman profil Scanlator + blok "Dukung kami!" di halaman detail seri.
- Field di `scanlator_profiles`: `support_dana`, `support_trakteer`, `support_tako`, `support_url_lain`.
- Validasi format URL saat disimpan (hanya https, host yang dikenal/terdaftar).

**BACKLOG (nanti, SETELAH sistem jalan & ada yang upload):**
saldo Scanlator, tombol tips di platform, revenue share premium 70/30,
pencairan manual, laporan per seri. Jangan dibangun di MVP — setiap itu
menambah kewajiban operasional (audit, pencairan, sengketa).

## 6. Keamanan & penyalahgunaan (prioritas)

- **Hak cipta**: checkbox pernyataan orisinalitas saat apply + form Report jadi jalur
  takedown; hapus < 24 jam kalau ada komplain pemilik hak. Ini syarat wajib sebelum launch.
- **Anti spam/bajakan**: cek duplikat slug & judul mirip; 1 Scanlator = 1 akun aktif;
  rate-limit upload (mis. 5 chapter/jam).
- **File upload**: validasi magic bytes gambar (bukan cuma ekstensi), tolak SVG/script,
  scan ukuran sebelum masuk R2, simpan di prefix `scanlator/<user_id>/`.
- **Token upload**: presigned URL berumur 15 menit via route admin yang sudah ada,
  diperluas untuk role scanlator dengan hak hanya ke prefix miliknya.
- **Uang tidak lewat platform** di MVP: tidak ada saldo/tips/pencairan sama sekali,
  jadi tidak ada permukaan penyalahgunaan dana. (Backlog Fase Later wajib audit penuh.)

## 7. Data (tabel baru, Postgres sosial yang sama)

| Tabel | Isi |
|---|---|
| `scanlator_applications` | Pengajuan jadi Scanlator: user_id, handle, deskripsi, contoh, status, catatan admin |
| `scanlator_profiles` | Profil publik Scanlator: bio, tautan dukungan (dana/trakteer/tako), total views |
| `scanlator_balance` | BACKLOG (Fase Later) — jangan buat di MVP |
| `scanlator_transactions` | BACKLOG (Fase Later) — jangan buat di MVP |
| Kolom baru di project | `owner_user_id` (pemilik seri), `review_status` (pending/approved/rejected), `review_note` |

Project milik admin lama: `owner_user_id = null` (dianggap milik platform).

## 8. Fase pengerjaan (direvisi 2026-11-05 — sistem dulu, donate saja)

- **Fase A — Identitas & apply**: role `scanlator`, halaman apply, antrean ACC di dashboard, badge profil.
- **Fase B — Upload + review**: form seri/chapter untuk Scanlator, status review, atribusi "Diunggah oleh" di kartu/detail/chapter, halaman profil Scanlator, watermark + kompresi.
- **Fase C — Link donate**: tautan DANA/Trakteer/Tako di profil Scanlator + blok "Dukung kami!" di detail seri. **Ini satu-satunya monetisasi di MVP.**
- **Fase Later (backlog, jangan dibangun sekarang)**: tips di platform, saldo + pencairan, revenue share premium 70/30, laporan per seri.
- **Fase F — Pengerasan**: kuota & rate-limit, anti-duplikat, jalur takedown/DMCA, audit log.

Setiap fase: staging build + deploy terpisah, commit + push (aturan tetap), uji end-to-end (apply → upload → review → terbit → klik donate).

## 9. Risiko & keputusan terbuka

1. **Hak cipta adalah risiko terbesar** — putuskan dulu: platform terbuka penuh (risiko
   DMCA) atau kurasi ketat (hanya seri yang dinyatakan orisinal/remake)? Rekomendasi: kurasi ketat di awal.
2. **Siapa yang pegang uang** — Tahap 1 sengaja tidak pegang uang sama sekali (eksternal),
   supaya legal & operasionalnya ringan. Saldo platform baru di Fase Later (backlog).
3. **Biaya storage** — estimasi kasar: 100 chapter × 15 MB = 1,5 GB; awasi kuota, jangan biarkan tanpa batas.
4. **Komunitas** (thread, voting karakter ala HoloToon) — sengaja di luar plan ini; bisa jadi Fase G kalau Scanlator sudah jalan.

## 10. Definisi selesai (MVP = Fase A–C, sistem + donate saja)

- User bisa apply → admin ACC → upload seri + chapter → review → terbit.
- Publik melihat atribusi Scanlator di kartu, detail, dan tiap chapter.
- Scanlator punya halaman profil dengan tautan donate eksternal yang bisa diklik.
- Tidak ada sistem saldo/tips/share di MVP — itu backlog Fase Later.
- Tidak ada regresi: source lain, premium, dan filter 18+ tetap jalan seperti sekarang.

## Catatan keputusan (2026-11-05, dari user)
- Notifikasi chapter baru **hanya untuk komik yang di-BOOKMARK** user.
  Riwayat baca TIDAK menerima push (sekali baca ≠ mau dapat notifikasi).
  (Sebelumnya sempat digabung bookmark+riwayat — sudah dikembalikan ke bookmark-only.)
- Filter 18+ Project: hanya flag `is_adult` dari toggle dashboard Project yang menentukan.


## Lampiran: S&K Scanlator (ringkas, teks penuh di PRD web /prd/scanlator bagian 8)
Catatan riset 2026-11-05: HoloToon TIDAK mempublikasikan S&K (footer hanya
Browse/Community/Dashboard/Kontak/Support; /terms & /rules 404). S&K Ryukomik
ditulis sendiri mengikuti norma scanlation Indonesia:
1. Satu tim = satu akun; larang jual-beli/pindah akun; nama tim unik.
2. Hak cipta: hanya konten berhak-unggah; larang re-upload TL tim lain;
   takedown maks 1x24 jam via form Report; pelanggaran berulang = cabut permanen.
3. Kualitas: min 8 halaman/chapter, gambar terbaca, watermark tim di halaman
   terakhir, chapter terbit tidak bisa diganti isinya.
4. Larangan: ilegal/SARA/malware/spam, drama antar-tim, minta transfer di komentar.
5. 18+: wajib toggle is_adult (satu-satunya penentu filter); salah tandai = sanksi.
6. Sanksi bertingkat: peringatan -> suspend 7 hari -> cabut akses.
7. Donate: hanya tautan eksternal milik sendiri; Ryukomik tidak pegang uang (MVP).
8. Data: email, file, IP upload dicatat untuk keamanan; S&K bisa berubah.
