# Plan: Scanlator — Lanjutan (Tahap 2+)

Tanggal: 2026-11-05
Status: TAHAP 1 SELESAI, tahap berikutnya menunggu perintah
Fokus: menutup celah sebelum Scanlator dibuka untuk publik

## Tahap 1 — Tombol Studio di profil publik (SELESAI)
- [x] Tombol "Buka Studio Scanlator" di `/scanlator/<handle>`, tepat di bawah blok identitas (sebelum bio).
- [x] Hanya tampil untuk **pemilik grup** (dicek lewat `/api/scanlator/profile` privat, bukan dari data publik).
- [x] Tidak tampil untuk pengunjung biasa.

## Tahap 2 — Scanlator bisa kelola project sendiri (prioritas tertinggi)
Masalah: sekarang hanya bisa kirim; salah judul/cover/chapter harus minta admin.
- [ ] `PATCH /api/scanlator/series/[slug]` — edit judul, deskripsi, genre, type, toggle 18+ milik sendiri. Edit yang sudah terbit → `review_status='pending'` lagi (re-review).
- [ ] `DELETE /api/scanlator/series/[slug]` — hapus project milik sendiri (soft delete).
- [ ] `PATCH/DELETE /api/scanlator/series/[slug]/chapter/[n]` — ganti judul chapter, hapus chapter.
- [ ] UI di tab Project: aksi Edit / Hapus per project + Edit / Hapus per chapter.
- [ ] Verifikasi: user lain tidak bisa edit/hapus (403), admin tetap bisa.
- [ ] Uji end-to-end + staging build + commit push.

## Tahap 3 — Notifikasi & alasan penolakan (SELESAI)
Masalah: Scanlator tidak tahu project di-ACC/ditolak/kena SP.
- [x] Kolom `review_note` untuk project (`project_manga.review_note`).
- [x] Admin wajib isi alasan saat menolak project.
- [x] Notifikasi in-app: tabel `scanlator_notifications` + badge di tab Ringkasan studio.
- [ ] (ditunda) Notifikasi Telegram ke Scanlator — butuh chat id; in-app sudah jalan.
- [x] Tampilkan alasan penolakan di kartu project + tombol "Kirim ulang setelah diperbaiki".
- [x] Uji: tolak project → notif muncul → edit → kirim ulang → ACC.

## Tahap 4 — Penegakan aturan & kuota
Masalah: S&K menjanjikan 8 halaman/chapter dan kuota 2 GB, tapi belum ditegakkan.
- [ ] Validasi minimal 8 gambar per chapter (kecuali chapter terakhir seri — beri penanda).
- [ ] Hitung storage per Scanlator (sum ukuran file di R2 prefix `scanlator/<handle>/`) + tolak kalau > 2 GB.
- [ ] Rate limit upload (mis. 30 gambar/menit per user).
- [ ] Tampilkan pemakaian kuota di tab Upload.
- [ ] Uji: upload 1 gambar → 400; upload lewat kuota → 413 dengan pesan jelas.

## Tahap 5 — Statistik & direktori
- [ ] `GET /api/scanlator/stats` — total views, chapter, pembaca per project (dari project-db).
- [ ] Tab Ringkasan: kartu views + project terpopuler.
- [ ] Halaman `/scanlator` (publik, bukan studio) → daftar semua grup: avatar, nama, jumlah project, terakhir update.
- [ ] Link direktori dari menu/nav.

## Tahap 6 — Anti-penyalahgunaan
- [ ] Cek duplikat judul/slug saat buat seri (fuzzy match → tolak atau minta konfirmasi).
- [ ] Deteksi re-upload: hash gambar pertama chapter, bandingkan dengan chapter tim lain.
- [ ] Form Report → jalur takedown: tombol "Laporkan" di halaman seri, masuk antrean admin dengan SLA 1×24 jam.
- [ ] Tombol "Ajukan banding" saat suspend/dicabut → tiket ke admin.

## Tahap 7 — Rapikan sisa
- [ ] Edit slug (sekali saja, dengan redirect 301 dari slug lama).
- [ ] Preview urutan gambar chapter sebelum kirim + hapus gambar dari daftar.
- [ ] Admin tab Scanlator: tampilkan daftar project per grup (tanpa pindah tab).
- [ ] Dukungan multi-user per grup (kalau nanti dibutuhkan) — desain tabel `scanlator_members`.

## Aturan kerja tiap tahap
1. Migrasi DB dulu (idempoten, `add column if not exists`).
2. API + validasi server (jangan hanya di UI).
3. UI flat sesuai `ryukomik-ui-flat-design` (radius 8–12px, tanpa gradient/glow).
4. Uji 390px (tidak ada overflow) + uji peran (pemilik / user lain / admin).
5. Staging build → deploy → commit → push.
