# Rencana Fitur dari Saran User (Nov 2026)

Status: #1 dikerjakan & deploy; #2–#5 masih rencana, urut dari yang paling murah.

Konteks teknis yang berlaku untuk semua item:
- Frontend `next` di `/home/ryukomik/ryukomik`, deploy lewat `./scripts/deploy.sh` (build staging).
- Data sosial sudah lokal (Postgres `ryukomik_social`), Supabase tinggal Auth.
- Egress dijaga: jangan menambah query per-item ke API eksternal; pakai cache/`unstable_cache`.
- Tidak ada emoji di UI; ikon wajib `lucide-react`.
- `next/image` tidak dipakai untuk cover chapter/komik.

---

## 1. Riwayat baca menampilkan cover — SELESAI

- `src/components/history/HistoryThumb.tsx` (baru): cover kecil 40x56 / 44x64 dengan placeholder ikon.
- `src/hooks/useHistoryThumbBackfill.ts` (baru): backfill maks 12 cover per kunjungan lewat `/api/series-thumb`, hasil disimpan ke `historyStore`.
- Dipakai di `/history` (`HistoryClient.tsx`) dan tab Riwayat di `/files` (`HistoryTab.tsx`).
- Deploy: `/history` 200, `/files` 200.
- Catatan: cakupan cover tergantung `/api/series-thumb`. Komiku & Kiryuu OK; `komikid` sedang mengembalikan pustaka kosong (`Data kosong / Komikindo limit`) sehingga detail/cover-nya gagal. Perlu perbaikan backend scraper komikid terpisah.

---

## 2. Komentar chapter bisa menyertakan gambar (sedang)

Tujuan: di komentar chapter (`CommentsSupabase.tsx` yang dipakai halaman chapter) user bisa melampirkan 1 gambar, tampil sebagai thumbnail yang bisa diklik.

### Langkah
1. **Upload**: pakai endpoint upload yang sudah ada untuk komentar komunitas (cek `src/app/api/upload/*` atau presign R2). Batasi: JPEG/PNG/WebP, maks 3 MB, satu gambar per komentar.
2. **Penyimpanan**: tambah kolom `image_url` (text) di tabel `comments` lewat `database/social/024_comment_images.sql`. Nullable, `https://` only.
3. **API**: `POST /api/comments` menerima `imageUrl`; validasi domain storage sendiri (bukan URL sembarang) untuk mencegah hotlink/SSRF.
4. **UI**: tombol ikon `ImagePlus` di composer chapter; preview sebelum kirim; render `<img>` dengan `loading="lazy"`, `decoding="async"`, max tinggi 240px, klik → buka tab baru.
5. **Moderasi**: admin bisa hapus komentar (sudah ada). Tambah laporan gambar? Cukup andalkan hapus admin + rate limit komentar yang sudah ada.
6. **Batas egress**: gambar disajikan langsung dari R2/storage (bukan proxy Next), tidak menambah beban server.

### Uji
- Kirim komentar dengan gambar → muncul di daftar, refresh tetap ada.
- Komen tanpa gambar tetap normal; hapus komentar ikut menghapus referensi gambar.
- Coba URL eksternal → ditolak 400.

Perkiraan: 1 sesi kerja, risiko rendah–sedang (butuh perubahan skema + UI).

---

## 3. Riwayat tonton donghua/anime

Tujuan: user bisa lanjut nonton episode terakhir, sama seperti "Lanjut Baca".

### Langkah
1. **Store**: `src/store/watchHistoryStore.ts` (zustand + persist), isi: `animeSlug`, `title`, `thumbnail`, `episodeSlug`, `episodeNumber`, `type` (`anime`/`donghua`), `updatedAt`. Maks 200 entri.
2. **Penanda**: di player (`src/components/anime/*Player*`), saat episode dibuka dan `currentTime > 30s` → `addWatchHistory`.
3. **UI**:
   - `/tonton`: section "Lanjut Tonton" di atas daftar (kartu 2:3, ikon `Play`).
   - `/donghua` dan `/anime`: section serupa kalau datanya ada.
   - Halaman `/riwayat-tonton` (opsional) dengan tombol hapus per item + hapus semua.
4. **Server**: tidak perlu tabel baru — semua di localStorage, nol egress. Kalau nanti mau lintas perangkat, baru pindah ke Postgres (tabel `watch_history`).

### Uji
- Buka episode, tunggu 35 detik, kembali → kartu muncul di "Lanjut Tonton" dengan episode benar.
- Ganti episode → entri lama diperbarui, tidak dobel.
- Hapus riwayat → kartu hilang.

Perkiraan: 1 sesi, risiko rendah.

---

## 4. Toggle konten 18+ di Setting

Tujuan: satu tombol di Setting. Saat OFF, semua konten 18+ hilang dari daftar, pencarian, dan halaman `/tonton`.

### Yang sudah ada
- `isAdultSource()` + `ADULT_SOURCE_IDS` di `src/config/sources.ts`.
- Gate 18+ per sesi di `/tonton` (`AdultGate.tsx`).

### Rancangan
1. **Preferensi**: simpan di localStorage `rk-hide-adult` (default: **sembunyikan** untuk pengunjung baru, karena ini situs publik) + cookie `rk_hide_adult=1` supaya server bisa memfilter saat SSR.
2. **Filter server**: helper `filterAdultSources()` di `src/lib/contentFilter.ts`; dipakai di route/SSR yang memuat daftar:
   - `/api/project/pustaka`, halaman `/terbaru`, `/pustaka`, `/genre/*`, pencarian, `/tonton`, `/donghua`.
   - Jangan mengandalkan filter client saja (konten tetap terkirim ke browser).
3. **UI Setting**: section "Konten" dengan toggle `Shield` / `EyeOff`, penjelasan singkat, dan konfirmasi sekali saat mematikan filter.
4. **Efek samping yang harus ditangani**:
   - Bookmark/riwayat lama yang berasal dari sumber adult: sembunyikan dari daftar, tapi jangan hapus data.
   - Sitemap & OG: jangan sertakan sumber adult saat filter aktif (SEO aman).
   - `/tonton` tab Hentai: hilang total saat filter ON, tanpa perlu gate.
   - Cache: halaman yang di-cache harus memvariasikan `Vary` atau memakai cookie di key; kalau tidak, user OFF bisa melihat hasil cache user ON.

### Uji
- OFF → `/`, `/terbaru`, pencarian, `/tonton` tidak memuat sumber adult; ON → muncul kembali setelah gate.
- Tidak ada flash konten adult saat hidrasi.
- Cache tidak bocor antar preferensi.

Perkiraan: 2–3 sesi, risiko sedang (banyak titik daftar + cache).

---

## 5. Koleksi: urutan + simpan langsung

### 5a. Simpan langsung tanpa favorit dulu — mudah
- API sudah mendukung: `POST /api/collections/[id]/items` dengan `{source, slug, title, image}` (tidak butuh bookmark).
- Tambah komponen `SaveToCollectionButton` (ikon `FolderPlus`) di halaman detail seri (`/komik/[slug]`, `/project/[slug]`, novel).
- Klik → dialog daftar koleksi (GET `/api/collections`) + tombol "Koleksi baru".
- Tanpa login → arahkan ke login.

### 5b. Urutan koleksi — sedang
- `user_collection_items` sekarang hanya punya `created_at` (kapan ditambahkan). Untuk "komik terupdate" perlu metadata update seri.
- Opsi murah: simpan `latest_chapter_at` saat item ditambahkan, ambil dari `/api/series-thumb` (sudah ada) atau dari daftar pustaka. Tidak real-time, tapi cukup untuk sorting.
- Opsi akurat: job harian yang menyegarkan `latest_chapter_at` untuk item koleksi (batch, 1 request per seri per hari, di-cache).
- UI: dropdown urutan `Terbaru ditambahkan` (default), `Komik terupdate`, `Terlama`.
- Query: `order by` dinamis di API `GET /api/collections/[id]/items`.

### Uji
- Simpan komik dari detail tanpa bookmark → masuk koleksi.
- Urutan "Komik terupdate" menempatkan seri dengan chapter terbaru di atas.
- Item tanpa metadata tidak hilang, hanya di urutan bawah.

Perkiraan: 5a setengah sesi; 5b 1–2 sesi.

---

## Urutan pengerjaan yang disarankan

1. #5a simpan langsung ke koleksi (paling murah, dampak jelas).
2. #2 gambar di komentar chapter (butuh skema, tapi terisolasi).
3. #3 riwayat tonton (murni client, aman).
4. #5b sorting koleksi (butuh metadata).
5. #4 toggle 18+ (paling lebar dampaknya, kerjakan terakhir dengan hati-hati).

Item di luar daftar tapi terkait: perbaikan backend `komikid` yang mengembalikan pustaka kosong, karena itu juga membuat cover riwayat komikid tidak muncul.
