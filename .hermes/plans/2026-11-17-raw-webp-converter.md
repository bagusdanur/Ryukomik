# Converter WebP untuk RAW Downloader — Analisis & Plan

**Pertanyaan:** bisakah converter WebP milik RyukomikBot diterapkan ke downloader RAW
supaya hasilnya sama seperti bot (potongan digabung, jadi WebP)?
**Jawaban singkat:** bisa. Tapi ada satu temuan penting: **setelan q95 milik bot justru
membesarkan file** untuk sumber yang gambarnya sudah JPEG/WebP.

---

## 1. Apa yang sebenarnya dilakukan converter bot

`RyukomikBot/raw_downloader/image_processing.py` punya tiga fungsi:

| Fungsi | Isi |
|---|---|
| `convert_images_to_webp` | tiap halaman → WebP kualitas **95**, dimensi tidak diubah |
| `merge_images_lossless` | halaman ditumpuk vertikal jadi strip, maksimal **14.000 px** per strip, halaman yang lebih tinggi dipotong jadi beberapa bagian, halaman lebih sempit ditaruh di tengah kanvas putih, hasil `_part001.webp` |
| `resize_for_editor` | mode `editor_safe`: tinggi dibatasi **8.192 px** |

Batas 14.000 px bukan angka asal: WebP mentok di 16.383 px, dan libwebp sering gagal
meng-encode kanvas 16.000 px.

Jadi converter bot itu **penyeragam format**, bukan pengecil ukuran.

---

## 2. Pengukuran nyata (4 halaman Mist, seri yang kamu sebut)

Sumber asli: JPEG, total **741 KB**, ukuran 800×2866 dan 800×1481.

```
Asli (JPEG)                  741 KB
─────────────────────────────────────
q95  per halaman           1.035 KB   ← 40% LEBIH BESAR
q95  digabung strip        1.097 KB   ← 48% LEBIH BESAR
q85  per halaman             603 KB   ← 19% lebih kecil
q85  digabung strip          750 KB   ← nyaris sama dengan asli
q80  per halaman             504 KB   ← 32% lebih kecil
q80  digabung strip          636 KB   ← 14% lebih kecil
q75  per halaman             427 KB   ← 42% lebih kecil
q75  digabung strip          580 KB   ← 22% lebih kecil
```

Kenapa q95 membesar: JPEG dari sumber sudah dikompres di kualitas rendah. Meng-encode
ulang ke WebP q95 memaksa menyimpan detail yang sebenarnya sudah dibuang — hasilnya
lebih berat. WebP baru menang kalau sumbernya PNG (seperti beberapa chapter project kita
yang 7 MB per gambar).

Kesimpulan: **kalau tujuanmu memperkecil file, q95 bukan pilihannya.**

---

## 3. Keputusan final (revisi 17 Nov)

| Hal | Keputusan |
|---|---|
| Format | WebP |
| Mode | **merge / strip saja** — bukan per halaman |
| Tinggi maksimum per strip | **12.000 px** |
| Kualitas | **95** (setelan bot), karena ukuran bukan masalah utama |
| Nama file | `<seri>_part001.webp`, `part002`, … |

Tidak ada pilihan mode di UI untuk versi pertama. Semua unduhan RAW keluar sebagai
beberapa strip WebP, bukan 27–60 file halaman.

### Kenapa 12.000 px — dan itu memang batas kita

Angka 12.000 bukan batas WebP (WebP mentok 16.383 px), tapi **batas di alur upload project kita**:

```ts
// src/utils/toWebp.ts
if (Math.max(bitmap.width, bitmap.height) > 12_000) return fallback;  // konversi dilewati
```

Gambar yang lebih tinggi dari 12.000 px **tidak dikonversi** saat diunggah dan tetap jadi
file besar (inilah penyebab PNG 7 MB per gambar yang kita temukan sebelumnya).
Dengan strip dibatasi 12.000 px, hasil unduhan RAW bisa langsung diunggah lewat Studio
tanpa melewati batas itu — konversi upload tetap jalan normal.

---

## 4. Cara kerja merge

Sama seperti bot, dengan batas diganti 12.000:

```
halaman 1..n diurutkan
  ↓
tumpuk vertikal selama belum lewat 12.000 px
  ↓
kalau satu halaman sendiri lebih tinggi dari 12.000 → dipotong jadi beberapa bagian
  ↓
halaman lebih sempit ditaruh di tengah kanvas putih
  ↓
simpan sebagai WebP q95 → <seri>_part001.webp
```

Contoh nyata: chapter 27 halaman @800×1.500 px → **4 strip** (±10.500 px per strip),
bukan 27 file.

---

## 5. Pengaman memori

Kanvas 800×12.000 px = ±28 MB di RAM. Yang berbahaya adalah halaman lebar (EvaScan bisa
16.000 px):

- lebar kanvas dibatasi **2.000 px**; gambar lebih lebar diturunkan dulu ke 2.000 px
- strip diproses **satu per satu**, bukan paralel
- kalau total tinggi chapter > 100.000 px, otomatis dipecah
- batas lama tetap: maks 150 gambar, maks 250 MB hasil

---

## 6. Perkiraan biaya

| Hal | Angka |
|---|---|
| CPU | ±1–2 detik per strip |
| RAM puncak | 30–60 MB per proses |
| Waktu 1 chapter | +6–10 detik |
| Jumlah file | 27 halaman → 3–5 file |
| Ukuran | bisa sedikit lebih besar dari sumber JPEG (q95), lebih kecil untuk sumber PNG |

Catatan jujur: untuk sumber JPEG (Mist), q95 membuat file **naik** sekitar 40% — dari 741 KB
jadi 1.035 KB untuk 4 halaman. Kamu sudah bilang ukuran bukan masalah, jadi ini diterima
demi keseragaman format dengan bot. Kalau nanti terasa berat, tinggal turunkan ke q85.

---

## 7. Tahapan

| Fase | Isi |
|---|---|
| 1 | Helper merge di `src/lib/rawImageConvert.ts` (sharp), batas 12.000 px |
| 2 | Pasang di route unduhan + token (mode strip selalu) |
| 3 | Uji 3 sumber: Mist (JPEG), Asura (WebP), project (PNG) — catat jumlah strip & ukuran |
| 4 | Deploy + kabari hasil ukurannya |

Tidak ada perubahan UI: tombol RAW tetap satu, hasilnya sekarang beberapa strip WebP.
