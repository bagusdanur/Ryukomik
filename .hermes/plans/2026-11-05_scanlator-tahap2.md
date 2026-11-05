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

## Tahap 4 — Kuota storage (SELESAI; aturan minimal halaman DIBATALKAN)
Keputusan user: aturan minimal 8 halaman/chapter tidak dipakai; cukup kuota storage.
- [x] ~~Validasi minimal 8 gambar per chapter~~ → dibatalkan, hapus juga dari S&K.
- [x] Hitung storage per Scanlator (prefix R2 `scanlator/<handle>/`) → tolak kalau > 2 GB (HTTP 413).
- [x] ~~Rate limit upload~~ → tidak dipakai (kuota sudah membatasi).
- [x] Indikator kuota di tab Upload (terpakai / 2 GB, bar warna, jumlah file).
- [x] S&K: hapus butir "minimal 8 halaman", perbarui batas teknis (30 MB/gambar, 60 gambar/chapter, kuota 2 GB).

## Tahap 5 — Statistik & direktori (SELESAI)
- [x] `GET /api/scanlator/stats` — total tayangan, total chapter, versi project (dari project-db).
- [x] Tab Ringkasan: kartu "Total tayangan" & "Total chapter" + panel "Project terpopuler".
- [x] Halaman publik `/scanlator/direktori` — daftar semua grup: avatar, nama, jumlah project, update terakhir, pencarian.
- [x] Link direktori di tab Ringkasan studio.

## Tahap 6 — Anti-penyalahgunaan (SELESAI kecuali hash gambar)
- [x] Cek duplikat judul saat buat seri (normalisasi; judul sama/mirip → 409 + saran).
- [x] Slug unik otomatis: kalau slug pernah dipakai (termasuk project terhapus) diberi akhiran.
- [ ] ~~Deteksi re-upload via hash gambar~~ → ditunda (butuh storage hash per gambar, volume besar).
- [x] Form laporan/takedown `/scanlator/lapor` + tombol "Laporkan" di halaman seri.
- [x] Antrean laporan di admin (tab Laporan) + aksi Selesaikan/Abaikan + catatan.
- [x] Tombol "Ajukan banding" saat akun disuspend (tiket masuk antrean laporan, kind=appeal).
- [x] Rate-limit 5 laporan/jam per user.

## Tahap 7 — Rapikan sisa (SELESAI kecuali slug edit & multi-user)
- [ ] ~~Edit slug~~ → ditunda; slug otomatis unik, perubahan slug butuh redirect 301 yang belum ada.
- [x] Pratinjau urutan gambar chapter sebelum kirim + tombol hapus per gambar.
- [x] Admin tab Scanlator: tombol "Lihat project" per grup (judul, status, tayangan).
- [ ] ~~Multi-user per grup~~ → ditunda; butuh tabel `scanlator_members` + UI undangan.

## Aturan kerja tiap tahap
1. Migrasi DB dulu (idempoten, `add column if not exists`).
2. API + validasi server (jangan hanya di UI).
3. UI flat sesuai `ryukomik-ui-flat-design` (radius 8–12px, tanpa gradient/glow).
4. Uji 390px (tidak ada overflow) + uji peran (pemilik / user lain / admin).
5. Staging build → deploy → commit → push.
