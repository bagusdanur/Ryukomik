# Quick Ads Dashboard Ryukomik — PLAN FINAL

> Status: FINAL — siap dieksekusi
> Keputusan user: **Opsi A (field terpisah, aman)** + **provider dinamis (bisa tambah/kurang)**
> Konteks: sekarang 2 iklan → nanti bisa jadi 1 atau 3 tanpa deploy ulang.

---

## 1. Ringkasan

Tambahkan menu **Quick Ads** pada kartu Akses Cepat dashboard admin untuk mengelola
daftar iklan secara **dinamis** (tambah/kurang bebas), bukan 2 toggle hardcoded.

Setiap iklan disimpan sebagai objek dengan field terpisah (bukan HTML mentah), lalu
sistem menyusun `<script>` sendiri. Ini mengikuti **Opsi A** — aman dari XSS.

Iklan aktif global di seluruh halaman (reader, preview, dashboard, Premium) kecuali
akun berstatus Premium.

---

## 2. Model Data

Konfigurasi disimpan di tabel `app_settings`, key `ads_config` (mengikuti pola
`apkSettings.ts` yang sudah ada, key `apk_download`).

```ts
export type AdProvider = {
  id: string;            // slug unik, mis. "monetag", "rajaapk", "provider-3"
  name: string;          // label tampil, mis. "Monetag"
  enabled: boolean;      // toggle per provider
  scriptUrl: string;     // HARUS https:// + hostname di allowlist
  zoneId: string;        // OPSIONAL, hanya angka (untuk provider tipe monetag)
  imageUrl?: string;     // OPSIONAL (banner custom, hostname allowlist)
  targetUrl?: string;    // OPSIONAL (link banner, hostname allowlist)
  createdAt?: string;
};

export type AdsConfig = {
  masterEnabled: boolean;        // master ON/OFF semua iklan
  providers: AdProvider[];       // ← DINAMIS: panjang bebas (1, 2, 3, ...)
  updatedAt?: string | null;
  updatedBy?: string | null;     // userId admin terakhir
  previous?: {                   // snapshot untuk rollback
    masterEnabled: boolean;
    providers: AdProvider[];
    updatedAt?: string | null;
    updatedBy?: string | null;
  } | null;
  configured?: boolean;
};
```

**Catatan penting:** `providers` adalah **array**, sehingga:
- Sekarang: 2 item (`monetag`, `rajaapk`).
- Kurangi 1 → hapus item dari array.
- Tambah jadi 3 → tambah item baru.
- Tidak ada batas jumlah hardcoded di kode. Batas hanya UX (mis. maks 10) + allowlist.

---

## 3. Default Awal (mengikuti produksi saat ini)

```ts
export const fallbackAdsConfig: AdsConfig = {
  masterEnabled: true,
  providers: [
    {
      id: "monetag",
      name: "Monetag",
      enabled: true,
      scriptUrl: "https://al5sm.com/tag.min.js",
      zoneId: "10944835",
    },
    {
      id: "rajaapk",
      name: "RajaAPK",
      enabled: true,
      scriptUrl: "https://gaslah.my.id/aan/siap/1788017146215-rajaapk.js",
      zoneId: "",
    },
  ],
  updatedAt: null,
  updatedBy: null,
  previous: null,
  configured: false,
};
```

Nilai ini persis menyamai isi `MonetagScript.tsx` saat ini (zone `10944835`,
`al5sm.com/tag.min.js`, dan `gaslah.my.id/...rajaapk.js`).

---

## 4. Validasi Domain (BUKAN allowlist kaku)

Keputusan user: **link apa aja boleh** (tidak mau repot tambah allowlist + deploy
tiap ganti network iklan).

Maka allowlist kaku dihapus, diganti **validasi bentuk** yang otomatis:

### Wajib lolos (semua mode):
- URL valid (`new URL()` sukses).
- **HTTPS wajib** — HTTP ditolak.
- **Tidak ada HTML / `<script>` mentah** — admin hanya isi URL, sistem yang nyusun script.
- **Blokir host berbahaya (SSRF/keamanan):**
  - IP privat: `127.*`, `10.*`, `192.168.*`, `172.16-31.*`, `169.254.*`
  - `localhost`, `.local`, `0.0.0.0`, hostname tanpa titik.
- Zone ID hanya angka (`/^\d+$/`), boleh kosong.

### Dua mode (toggle di form Quick Ads):

| Mode | Perilaku |
|---|---|
| **`bebas`** (DEFAULT — sesuai permintaan user) | Domain apa aja boleh, asal lolos validasi di atas. Tambah/kurang/ganti domain kapan aja tanpa deploy. |
| **`terkunci`** | Hanya hostname di daftar `allowedHosts` yang boleh. Daftar ini **diedit lewat form dashboard** (bukan lewat kode), jadi tetap tidak perlu deploy. |

`allowedHosts` default (dipakai saat mode `terkunci`): `["al5sm.com", "gaslah.my.id"]`.

### Konfirmasi domain baru:
Saat menyimpan provider dengan hostname yang **belum pernah dipakai** sebelumnya,
API mengembalikan flag `newHost: true` → UI minta konfirmasi sekali
("Domain X baru pertama kali dipakai. Yakin?"). Semua perubahan dicatat
(`updatedBy` + `updatedAt`) dan bisa di-**Rollback**.

> Hasil: user bisa input `https://quge5.com/88/tag.min.js` zone `197371` **langsung
> di form**, tanpa developer, tanpa deploy. Tetap aman karena HTTPS wajib, HTML
> dilarang, dan host berbahaya diblokir.

### Field allowlist/validasi baru di AdsConfig:
```ts
validationMode?: "bebas" | "terkunci";   // default "bebas"
allowedHosts?: string[];                 // dipakai saat mode "terkunci"
```

---

## 5. Validasi & Keamanan

Semua validasi dijalankan **di server** (API route), bukan hanya di client.

| Aturan | Implementasi |
|---|---|
| Tidak boleh HTML/`<script>` mentah | Field hanya menerima URL/teks; `<` `>` `"` di-strip; `scriptUrl` di-parse `new URL()` |
| URL wajib HTTPS | `parsedUrl.protocol === "https:"` — HTTP ditolak |
| Host berbahaya diblokir | cek `isBlockedHost(hostname)` — IP privat/localhost/`.local`/tanpa titik |
| Mode terkunci (opsional) | jika `validationMode === "terkunci"`, hostname harus ada di `allowedHosts[]` |
| Zone ID hanya angka | `/^\d+$/` — kosong boleh (provider tanpa zone) |
| masterEnabled boolean | koersi `!== false` |
| providers minimal 0, maks 10 | batasi panjang array |
| id unik & slug | `/^[a-z0-9-]{2,32}$/`, cek duplikat |
| Hanya admin | `verifyAdminRequest(request)` (sudah ada di `@/lib/adminApi`) |
| Rollback hanya admin | sama, endpoint admin |

**Endpoint public tidak pernah menerima input** — hanya mengembalikan data minimal.

---

## 6. Endpoint

### 6.1 Public — `GET /api/ads-config`
- Mengembalikan payload kecil HANYA yang dibutuhkan loader:
```json
{
  "masterEnabled": true,
  "providers": [
    { "id": "monetag", "enabled": true, "scriptUrl": "https://al5sm.com/tag.min.js", "zoneId": "10944835", "imageUrl": null, "targetUrl": null }
  ]
}
```
- **Tidak** mengirim `updatedBy`, `previous`, timestamps internal.
- Cache server: `revalidate: 60` (atau `unstable_cache` tag `ads-config`).
- Cache-Control: `public, s-maxage=60, stale-while-revalidate=300`.

### 6.2 Admin — `GET /api/admin/ads-settings`
- Butuh admin. Mengembalikan `AdsConfig` penuh (termasuk `previous`, `updatedBy`).
- `Cache-Control: private, max-age=0`.

### 6.3 Admin — `PUT /api/admin/ads-settings`
- Body: `{ masterEnabled, providers }`.
- Validasi penuh (bagian 5). Jika invalid → 400 + pesan spesifik.
- Sebelum menulis, simpan config lama ke `previous`.
- Isi `updatedAt = now`, `updatedBy = admin.userId`.
- Setelah sukses: **invalidate cache** (`revalidateTag("ads-config")`).
- Balas `AdsConfig` baru + `message`.

### 6.4 Admin — `POST /api/admin/ads-settings/rollback`
- Tukar `current` ↔ `previous`.
- Invalidate cache, balas config hasil.
- Jika `previous` null → 400 "Tidak ada konfigurasi sebelumnya."

---

## 7. Library — `src/lib/adsSettings.ts`

Mengikuti struktur `src/lib/apkSettings.ts`:

- `ADS_SETTING_KEY = "ads_config"`
- `ALLOWED_AD_HOSTS = ["al5sm.com", "gaslah.my.id"]`
- `fallbackAdsConfig`
- `normalizeAdsConfig(value)` — dipakai read & menulis, idempotent
- `validateAdsConfig(input)` → `{ ok, config } | { ok:false, error }` (aturan bagian 5)
- `getAdsConfig()` — baca Supabase (`maybeSingle` seperti apkSettings)
- `getPublicAdsConfig()` — proyeksi minimal + cache
- `setAdsConfig(next, adminUserId)` — simpan `previous` = config lama, tulis baru, invalidate cache
- `rollbackAdsConfig(adminUserId)` — tukar current/previous, invalidate cache
- `invalidateAdsCache()` — `revalidateTag("ads-config")`

**Pembacaan Supabase di-cache** dengan `unstable_cache` (tag `ads-config`, revalidate 60)
agar tidak query tiap kunjungan. `setAdsConfig`/`rollback` memanggil `revalidateTag`
supaya perubahan langsung dipakai pada kunjungan berikutnya.

---

## 8. Loader Global — ubah `src/components/MonetagScript.tsx`

Ubah dari hardcoded 2 script → loader berbasis config.

Alur:
1. `usePremiumStatus()` → tunggu `loading === false` sebelum pasang script.
2. Fetch `GET /api/ads-config` (sekali, di-cache browser).
3. Jika `masterEnabled === false` atau `isPremium === true` → **jangan pasang / bersihkan**.
4. Untuk setiap provider `enabled === true`:
   - Cek guard: `script[data-ad-provider="<id>"]` sudah ada? → skip (cegah ganda saat
     navigasi Next.js).
   - Buat `<script>`: set `src`, `async = true`, `dataset.adProvider = id`,
     dan `dataset.zone = zoneId` jika ada.
   - Append ke `document.body`.
5. Cleanup:
   - Saat unmount / master off / provider off / user jadi premium:
     hapus semua `script[data-ad-provider]` dan elemen terkait
     (`iframe[data-ad-provider]`, div iklan) yang sudah ter-inject.
6. **Banner Premium (`AdBanner`) & AntiAdblock tidak diubah** — tetap bekerja seperti sekarang.

**Pengecualian path:** tidak ada. Loader sudah global di `layout.tsx` (line 94),
jadi otomatis aktif di chapter, reader, anime, donghua, hentai, preview, dashboard,
Premium, dan pembayaran. Satu-satunya pengecualian adalah **akun Premium**.

---

## 9. Dashboard

### 9.1 Tambah page id
Di `src/app/dashboard/DashboardClient.tsx`:
- Tambah `"quick-ads"` ke union `DashboardPage` (line 41-52).
- Tambah `"quick-ads"` ke ketiga array `validPages` (line 165, 304, 319).

### 9.2 Kartu Akses Cepat
Di `src/components/dashboard/DashboardHomeTab.tsx` bagian Akses Cepat (line 364+):
tambah satu tombol (pola sama seperti tombol existing):
```tsx
<button onClick={() => setPage("quick-ads")} ...>
  <FiZap />  {/* atau FiSliders */}
  <p>Quick Ads</p>
  <p>Kelola iklan</p>
</button>
```

### 9.3 Tab baru — `src/components/dashboard/QuickAdsTab.tsx`
Mengikuti pola `ApkSettingsTab.tsx`. Isi:
- **Master ON/OFF** semua iklan (toggle besar).
- **Daftar provider** (map dari `config.providers`), tiap kartu berisi:
  - Nama provider (input teks).
  - Toggle enabled.
  - Input **Script URL** (placeholder `https://...`).
  - Input **Zone ID** (opsional, hanya angka).
  - Input **Image URL** & **Target URL** (opsional, untuk banner custom).
  - Tombol **Hapus** (kurangi provider) + konfirmasi.
- Tombol **+ Tambah Iklan** (tambah provider baru, id auto-slug).
- Status: config aktif + waktu pembaruan + admin terakhir.
- Tombol **Simpan**, **Muat Ulang**, **Pulihkan Konfigurasi Sebelumnya** (rollback).
- **Tidak ada preview iklan live di form** (agar tidak menambah impression).

### 9.4 Navigasi
Sesuai plan: **hanya kartu Akses Cepat**, TIDAK ditambahkan ke nav bawah mobile
(`navItems` line 1056 dibiarkan apa adanya).

### 9.5 Wiring di `DashboardClient.tsx`
Mengikuti pola `apkSettings` yang sudah ada:
- state: `adsConfig`, `adsLoading`, `adsSaving`, `adsNotice`.
- `fetchAdsSettings()` → GET `/api/admin/ads-settings`.
- `saveAdsSettings(next?)` → PUT `/api/admin/ads-settings`.
- `rollbackAdsSettings()` → POST `/api/admin/ads-settings/rollback`.
- `useEffect`: `if (authed && page === "quick-ads") fetchAdsSettings();`
- render `<QuickAdsTab ... />` saat `page === "quick-ads"`.

---

## 10. File yang Dibuat / Diubah

**Baru:**
- `src/lib/adsSettings.ts`
- `src/app/api/ads-config/route.ts` (public GET)
- `src/app/api/admin/ads-settings/route.ts` (admin GET/PUT)
- `src/app/api/admin/ads-settings/rollback/route.ts` (admin POST)
- `src/components/dashboard/QuickAdsTab.tsx`

**Diubah:**
- `src/components/MonetagScript.tsx` (loader config-driven)
- `src/components/dashboard/DashboardHomeTab.tsx` (kartu Quick Ads)
- `src/app/dashboard/DashboardClient.tsx` (page id, state, wiring, render)
- `src/lib/adsSettings.ts` allowlist (saat mau pakai hostname baru, mis. `quge5.com`)

**Tidak diubah:** `AdBanner.tsx`, `AntiAdblock.tsx`, `layout.tsx` (loader tetap global).

---

## 11. Deployment Aman — JANGAN Matikan Ryukomik saat Build ⚠️

**ATURAN WAJIB (permintaan user):** build **TIDAK BOLEH** bikin `ryukomik` mati.

### Masalah flow lama (`ryupull`)
Build jalan langsung di `~/ryukomik/.next` (folder produksi yang sedang di-serve PM2).
Kalau build gagal/timeout di VPS 2CPU → `.next` jadi **partial/korup** → web **502**.

### Flow baru — Build Isolasi (staging → swap)
Build di **folder terpisah** dulu, baru timpa. Web tetap jalan sepanjang build.

```bash
# 0. Konfigurasi
SRC=~/ryukomik                     # folder produksi (JANGAN di-build di sini)
STAGE=~/ryukomik-build             # folder build terpisah
PM2APP=ryukomik

# 1. Siapkan staging (sync kode, TANPA .next lama & node_modules)
mkdir -p "$STAGE"
rsync -a --delete \
  --exclude '.next' --exclude 'node_modules' --exclude '.git' \
  "$SRC/" "$STAGE/"

# 2. Link node_modules dari produksi (hemat disk & waktu, tidak install ulang)
ln -sfn "$SRC/node_modules" "$STAGE/node_modules"

# 3. Build DI STAGING (produksi tetap jalan normal)
cd "$STAGE" && npx next build
# ⚠️ VPS 2CPU: build 3-5 menit → CPU ~100%, web sementara LAG (tapi TIDAK MATI).
# Beri tahu user di awal. Jalankan di background + verifikasi selesai.

# 4. Verifikasi build SUKSES sebelum menyentuh produksi
test -f "$STAGE/.next/prerender-manifest.json" || { echo "BUILD GAGAL — produksi aman, tidak disentuh"; exit 1; }
test -f "$STAGE/.next/BUILD_ID" || { echo "BUILD GAGAL (no BUILD_ID)"; exit 1; }

# 5. BACKUP .next produksi (untuk rollback cepat)
STAMP=$(date +%Y%m%d-%H%M%S)
cp -a "$SRC/.next" "$SRC/.next.bak-$STAMP"

# 6. TIMPA cache produksi dengan hasil build baru (atomic swap)
mv "$SRC/.next" "$SRC/.next.old-$$" 2>/dev/null
mv "$STAGE/.next" "$SRC/.next"

# 7. Restart PM2 (web kembali dengan build baru, downtime <2s)
pm2 restart "$PM2APP" --update-env

# 8. Verifikasi web hidup
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q 200 \
  && echo "OK web hidup" \
  || { echo "GAGAL — rollback!"; \
       mv "$SRC/.next" "$SRC/.next.broken-$STAMP"; \
       mv "$SRC/.next.old-$$" "$SRC/.next"; \
       pm2 restart "$PM2APP" --update-env; }

# 9. Bersihkan: hapus backup build baru & folder lama (SETELAH sukses & verif OK)
rm -rf "$SRC/.next.old-$$"
rm -rf "$SRC/.next.bak-$STAMP"
rm -rf "$STAGE/.next"          # hasil build sudah dipindah ke produksi
```

### Prinsip kunci
1. **Build di `STAGE`** — produksi (`SRC/.next`) tidak pernah dalam kondisi setengah jadi.
2. **Verifikasi dulu** (`prerender-manifest.json` + `BUILD_ID`) sebelum menimpa.
3. **Backup** `.next.bak-<stamp>` sebelum swap → bisa rollback instan.
4. **Timpa (swap)** hanya setelah build terbukti sukses.
5. **Hapus backup** (`.next.bak-*`, `.next.old-*`) & staging `.next` **setelah** verifikasi
   web 200 — sesuai permintaan user ("backup build barunya hapus").
6. **PM2 TIDAK di-stop saat build** — hanya `pm2 restart` di akhir (downtime ~detik).
7. Kalau build **gagal** → tidak ada yang berubah, produksi tetap jalan. Buang staging.

### Update skill `ryupull`
Ganti step build (yang sekarang build langsung di `~/ryukomik`) menjadi flow
staging di atas, supaya aturan "jangan matikan ryukomik" berlaku otomatis tiap deploy.

---

## 12. Pengujian (QA)

- [ ] Config awal memuat 2 iklan untuk user gratis.
- [ ] Iklan muncul di chapter/reader, anime, donghua, hentai, preview, dashboard, Premium.
- [ ] User Premium bebas iklan di semua halaman.
- [ ] Master OFF → semua script & elemen iklan terhapus.
- [ ] Toggle 1 provider OFF → hanya provider itu yang hilang, sisanya tetap.
- [ ] **Tambah provider ke-3** → script baru terpasang tanpa deploy.
- [ ] **Hapus 1 provider** → tinggal 1 iklan, tanpa error.
- [ ] Ubah Zone ID / URL valid → aktif setelah simpan + refresh.
- [ ] URL HTTP → ditolak. HTML mentah → ditolak. Host berbahaya (localhost/IP privat) → ditolak.
- [ ] URL dari domain **baru manapun** (mis. `quge5.com`) → **DITERIMA** tanpa deploy (mode bebas).
- [ ] Mode terkunci aktif → hostname di luar `allowedHosts` ditolak.
- [ ] Zone ID nonangka → ditolak.
- [ ] Navigasi Next.js (pindah halaman) → tidak ada script ganda.
- [ ] Admin API menolak user biasa (403) & tanpa sesi (401).
- [ ] Rollback mengembalikan konfigurasi sebelumnya.
- [ ] Cache: perubahan config terlihat pada kunjungan berikutnya (≤60s / langsung setelah invalidate).
- [ ] `npm run lint`, `tsc --noEmit`, `npm run build` sukses.
- [ ] Uji desktop & mobile.

---

## 13. Contoh Input User (Opsi A — tanpa allowlist)

User TIDAK paste `<script>` mentah. Contoh iklan `quge5.com` zone `197371`:

1. Di form Quick Ads → **+ Tambah Iklan**:
   - Nama: `Quge5`
   - Script URL: `https://quge5.com/88/tag.min.js`
   - Zone ID: `197371`
2. Klik Simpan. (Mode `bebas` → tidak perlu tambah allowlist / deploy.)
3. Loader otomatis menyusun:
   ```html
   <script src="https://quge5.com/88/tag.min.js" data-zone="197371"
           async data-ad-provider="quge5"></script>
   ```

Mau tambah provider ke-3 → klik **+ Tambah Iklan** lagi. Mau kurangi → tombol **Hapus**.
Semua tanpa deploy.

---

## 14. Asumsi

- "Semua halaman" = tanpa pengecualian path; hanya akun Premium yang bebas iklan.
- Keuntungan bebas iklan Premium dipertahankan.
- Jumlah iklan dinamis (array), dibatasi 0–10 untuk UX/keamanan.
- **Link/domain apa aja boleh** (mode `bebas` default) — tanpa allowlist kaku, tanpa deploy.
  Mode `terkunci` tersedia opsional, daftarnya diedit lewat dashboard.
- Tetap dipaksa: HTTPS, no HTML mentah, blokir host berbahaya.
- Banner Premium & AntiAdblock tidak diubah.
- Deploy pakai flow build-isolasi (bagian 11) — web tidak pernah mati.

---

## 15. Urutan Eksekusi (untuk implementasi)

1. `src/lib/adsSettings.ts` (model, default, validasi bentuk, blocklist host, get/set/rollback, cache).
2. API routes: public `ads-config`, admin `ads-settings` (GET/PUT), admin rollback.
3. `MonetagScript.tsx` → loader config-driven + guard anti-ganda + cleanup.
4. `QuickAdsTab.tsx` (form dinamis add/remove provider + toggle mode bebas/terkunci).
5. `DashboardHomeTab.tsx` (kartu) + `DashboardClient.tsx` (page id, state, wiring, render).
6. QA (bagian 12) → lint/tsc/build.
7. **Deploy pakai flow build-isolasi (bagian 11)** — build di staging, timpa, hapus backup.
8. (Opsional) update skill `ryupull` dengan flow baru.
