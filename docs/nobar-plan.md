# Plan: Nobar (Nonton Bareng) Anime

Dokumen ini adalah rencana kerja, bukan kode. Ditulis sebelum implementasi
supaya ruang lingkup dan batasannya jelas lebih dulu.

## 1. Tujuan

Pengunjung halaman episode bisa **nonton bareng**: satu orang jadi tuan rumah
(host) yang memegang kontrol putar, penonton lain ikut tersinkron, sambil
**ngobrol di chat** dan mengirim **reaksi cepat**.

Target pengalaman:
- Dari halaman episode, satu klik "Nobar" → ruang langsung jadi.
- Orang lain melihat badge "🔴 3 nonton bareng" di episode yang sama → klik → ikut.
- Chat + daftar peserta + reaksi muncul di samping/bawah video.
- Kalau host pause, video penonton ikut pause (untuk server yang bisa dikontrol).

## 2. Batasan yang mengikat

| Batasan | Konsekuensi pada desain |
| --- | --- |
| **Tidak boleh menyentuh Supabase** (egress) | Semua data nobar di **PostgreSQL VPS** (`SOCIAL_DATABASE_URL`). Auth tetap Supabase, tapi verifikasi JWT **lokal** (JWKS) seperti komentar anime. |
| Tidak ada Redis / pub-sub di VPS | Tidak ada WebSocket asli. Realtime lewat **polling hemat** (lihat §6). |
| Cloudflare di depan | **Hindari SSE/streaming panjang** (CF bisa buffering, ada batas ~100s). Pakai polling biasa. |
| Server iframe tidak bisa dikontrol | Sinkronisasi video hanya untuk server **Ryu-lokal** (filedon/mega/blogger) yang diputar `<video>` milik kita. Server lain → **mode chat saja**. |

## 3. Pengalaman pengguna

**Host:**
1. Buka episode → pilih server **Ryu-lokal** → tombol **"Mulai Nobar"**.
2. Muncul panel: link undangan + kode ruang.
3. Host bisa pause/play/seek; posisinya otomatis dibagikan.

**Penonton:**
1. Lihat badge **"🔴 2 nonton bareng"** di episode → klik.
2. Masuk ke ruang, video mengikuti host, ikut chat & reaksi.
3. Tanpa login: **boleh lihat** chat & peserta; **harus login** untuk kirim.

**Halaman:** `/anime/nobar/[id]`
- Desktop: video besar di kiri, panel kanan (tab **Chat** / **Peserta**).
- Mobile: video di atas, panel di bawah (tab Chat / Peserta).

## 4. Skema database (migration `005_nobar.sql`)

```sql
create table nobar_rooms (
  id uuid primary key default gen_random_uuid(),
  episode_slug text not null,
  episode_title text,
  host_id uuid not null references social_profiles(user_id) on delete cascade,
  host_name text not null,
  player_label text,                      -- mis. "Ryu-lokal 480p"
  is_playing boolean not null default false,
  position_seconds numeric not null default 0,
  playback_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
-- satu ruang aktif per episode (bisa dilonggarkan nanti)
create unique index nobar_one_active_room on nobar_rooms(episode_slug) where ended_at is null;
create index nobar_rooms_recent on nobar_rooms(ended_at, created_at desc);

create table nobar_members (
  room_id uuid not null references nobar_rooms(id) on delete cascade,
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  name text not null,
  avatar_url text,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table nobar_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references nobar_rooms(id) on delete cascade,
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  name text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index nobar_messages_room on nobar_messages(room_id, created_at desc, id desc);

create table nobar_reactions (
  room_id uuid not null references nobar_rooms(id) on delete cascade,
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id, emoji)
);
```

Semua tabel baru ada di **PostgreSQL VPS**. Tidak ada perubahan Supabase.

## 5. API (semua di `/api/social/nobar`)

| Method | Path | Fungsi | Akses |
| --- | --- | --- | --- |
| `GET` | `/nobar?slug=<episode>` | Cari ruang aktif episode (+ jumlah peserta) | publik |
| `POST` | `/nobar` | Buat ruang (host = pemanggil) | login |
| `GET` | `/nobar/[id]` | **Polling utama**: state ringkas + delta chat + peserta | publik |
| `PATCH` | `/nobar/[id]` | Host update `is_playing`/`position_seconds` | host saja |
| `POST` | `/nobar/[id]/messages` | Kirim chat | login |
| `POST` | `/nobar/[id]/join` | Gabung (upsert member) | login |
| `DELETE` | `/nobar/[id]/join` | Keluar | login |
| `POST` | `/nobar/[id]/reactions` | Kirim reaksi emoji | login |
| `DELETE` | `/nobar/[id]` | Tutup ruang | host saja |

## 6. Realtime hemat (kunci biar ringan)

Tidak ada WebSocket → **polling cerdas**:

- Satu endpoint `GET /nobar/[id]?since=<messageId>&v=<stateVersion>`.
  Server hanya mengirim **yang berubah** (chat baru + posisi bila `v` beda).
- Interval **2,5 detik** saat tab aktif.
- **Berhenti total saat tab tidak aktif** (`document.visibilityState === "hidden"`).
- Heartbeat `last_seen` di-update **maksimal 1× / 10 detik** per orang.
- Ruang tanpa aktivitas **> 15 menit** → `ended_at` diisi otomatis (lazy saat
  di-poll, tanpa cron).
- Peserta dianggap keluar bila `last_seen` > 45 detik.

Perkiraan beban: 10 penonton, delta ~1 KB/poll → ~24 KB/menit/ruang saat ramai,
dan **nol** saat semua tab disembunyikan. Ini beban VPS sendiri, bukan Supabase.

> Kalau nanti terasa kurang mulus, opsi lanjut: **SSE** atau WebSocket di
> backend `Anime-Backend` (port 3014) — tapi itu fase 3, bukan MVP.

## 7. Sinkronisasi pemutaran

- **Host = sumber kebenaran.** Host mengirim posisi saat play/pause/seek, dan
  sekali tiap 3 detik saat sedang main.
- Penonton menghitung posisi sekarang:
  `pos = position_seconds + (is_playing ? now - playback_updated_at : 0)`
- Penonton **snap** ke posisi host hanya bila selisih **> 2,5 detik** (biar tidak
  goyang/glitch); selisih kecil dibiarkan.
- **Hanya untuk server Ryu-lokal** (kita pegang `<video>`). Untuk server iframe,
  tombol nobar tetap ada tapi otomatis **mode chat saja** + keterangan jujur
  "server ini tidak bisa disinkronkan".

## 8. Komponen UI (file baru)

- `src/components/anime/NobarButton.tsx` — tombol/badge di halaman episode
  (deteksi ruang aktif untuk episode ini).
- `src/components/anime/NobarRoom.tsx` — pemutar + panel, orkestrasi polling.
- `src/components/anime/NobarChat.tsx` — daftar pesan + input.
- `src/components/anime/NobarMembers.tsx` — daftar peserta.
- `src/components/anime/NobarReactions.tsx` — bar emoji + animasi mengambang.
- `src/lib/social/nobar.ts` — tipe bersama + helper posisi/drift.
- Perubahan `AnimePlayer.tsx`: **opsi** menerima `syncControl` (ref callback)
  supaya host bisa melaporkan & penonton bisa menerima posisi. Perubahan ini
  **aditif** — tidak mengubah perilaku pemutar yang sekarang.

## 9. Keamanan

- `PATCH`/`DELETE` ruang: cek `host_id === userId` (kalau bukan → 403).
- Kirim chat: login wajib, `socialLimit` (mis. 1 pesan / 1,5 detik), isi ≤ 300 char.
- Reaksi: 1 per emoji per orang (PK di skema), rate limit ringan.
- Nama peserta diambil dari `social_profiles` (server), **bukan** dari client.
- Ruang publik: chat bisa dilihat anonim, tapi menulis wajib login.

## 10. Egress & beban

| Sumber | Naik? |
| --- | --- |
| Egress Supabase | **Tidak** — tidak ada tabel/query Supabase baru; auth JWT lokal. |
| Bandwidth VPS (apiv2) | Naik **hanya** bila video ditarik lewat proxy VPS (seperti streaming biasa). Penonton yang nonton = masing-masing 1 aliran video. |
| CPU/DB VPS | Ringan: polling delta + tutup otomatis ruang nganggur. |

Catatan: kalau 10 orang nobar episode 480p (~77 MB), itu ~770 MB bandwidth VPS
untuk satu sesi — sama seperti 10 orang streaming sendiri-sendiri. Nobar tidak
melipatgandakan beban video.

## 11. Tahapan implementasi

**Fase 1 — MVP "chat + peserta" (1 sesi):**
1. Migration `005_nobar.sql` + jalankan sebagai superuser.
2. Route `GET/POST /nobar` + `GET /nobar/[id]` + `join` + `messages`.
3. `NobarButton` di halaman episode + halaman `/anime/nobar/[id]` (chat + peserta).
4. Polling 2,5s + auto-tutup ruang nganggur.
→ Hasil: sudah bisa nobar sambil ngobrol. Video belum tersinkron.

**Fase 2 — sinkronisasi video (1 sesi):**
5. `PATCH /nobar/[id]` (host) + `syncControl` di `AnimePlayer`.
6. Logika drift penonton + indikator "Host mem-pause".
7. Hanya aktif untuk server Ryu-lokal; server lain → mode chat saja.

**Fase 3 — polish (opsional):**
8. Reaksi emoji mengambang di atas video.
9. Badge jumlah penonton realtime di halaman episode & daftar anime.
10. Notifikasi "temanmu mulai nobar" (pakai `social_notifications`, tipe baru).
11. "Jadwal nobar" (ruang dengan `starts_at` di masa depan).

## 12. Risiko & mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Polling jadi beban kalau ruang banyak | Delta-only, interval 2,5s, pause saat tab hidden, auto-tutup 15 menit |
| Sinkronisasi goyang di koneksi lambat | Snap hanya saat drift > 2,5s, bukan tiap detik |
| Server iframe tidak bisa disinkron | Mode chat saja + keterangan jujur ke pengguna |
| Ruang "hantu" (host menutup tab) | `last_seen` host basi > 45s → host dialihkan ke peserta tertua |
| Spam chat | Rate limit + batas panjang |

## 13. Yang TIDAK dikerjakan (di luar lingkup)

- Supabase **tidak disentuh** sama sekali (syarat mutlak).
- Tidak ada voice/video call.
- Tidak ada sinkronisasi untuk server iframe pihak ketiga.
- Tidak ada unduhan episode dari dalam ruang nobar.
