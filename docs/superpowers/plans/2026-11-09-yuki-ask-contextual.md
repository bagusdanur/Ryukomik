# # Plan Tombol “Tanya Yuki” Kontekstual — Sisi Ryukomik

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Di halaman detail dan chapter komik ada tombol “Tanya Yuki” yang membuka widget Yuki dengan konteks judul/chapter dan pertanyaan awal terisi.

**Architecture:** Tombol kontekstual memicu widget Yuki lewat event kustom; `YukiChatEmbed` membangun URL embed penuh (`ctx` + `prefill`) sebelum iframe dimuat. Halaman `/chapter` tetap menyembunyikan FAB biasa, tapi tombol kontekstual tetap bisa membuka panel.

**Tech Stack:** Next.js, React Client Component, `YukiChatEmbed.tsx`, custom event, query URL encoder.

**Spec:** `docs/yuki-embed-integration-plan.md` (Tugas 3).

## Konteks

- Tugas 1 & 2 sudah selesai: widget Yuki mengirim `ctx` dan meminta Storage Access saat FAB diklik.
- `YukiChatEmbed.tsx` saat ini disembunyikan di `/chapter`, `/novel/chapter`, `/scanlator`, `/aturan` agar tidak menutupi area baca.
- Tugas 3 butuh kontrak baru di sisi Yuki untuk mengisi pertanyaan awal; tanpa kontrak itu tombol tetap berguna hanya sebagai konteks (`ctx`).
- UI harus flat, mobile-first, tanpa emoji, konsisten dengan `globals.css` (border tipis / radius kecil).

## File yang dibuat/diubah

- `src/components/AskYukiButton.tsx` (baru)
  - Tombol kecil “Tanya Yuki”.
  - Props: `title: string`, `chapter?: string`, `prefill?: string`.
  - On click: dispatch event `open-yuki` dengan detail `{ ctx, prefill }`.
- `src/components/YukiChatEmbed.tsx`
  - Tambah state `askPayload: { ctx: string; prefill?: string } | null`.
  - Dengarkan event `open-yuki`; saat payload datang, set `open=true` meski path masuk daftar sembunyi.
  - URL iframe: `https://yuki.ryukomik.web.id/embed.html?ctx=<ctx>&prefill=<prefill>` (prefill opsional, maks 500 karakter, selalu `encodeURIComponent`).
- `src/app/komik/[source]/[slug]/DetailClient.tsx`
  - Tempel tombol kontekstual di area aksi detail.
  - `ctx` = judul komik; `prefill` default = `Ceritakan tentang komik ini`.
- `src/app/chapter/[source]/[...slug]/ChapterClient.tsx`
  - Tempel tombol kontekstual di header baca (jangan menutupi tombol simpan/tab).
  - `ctx` = `<Judul> <Chapter N>`; `prefill` default = `Ceritakan chapter ini`.

## Kontrak sisi Yuki (prasyarat untuk prefill)

- Param baru: `prefill` (query URL embed). Nilai = teks pertanyaan awal yang tampil di kolom chat, **tidak terkirim otomatis**.
- Jika `prefill` tidak didukung Yuki, perilaku fallback: Yuki hanya memakai `ctx`; tombol tetap membuka chat dengan konteks benar.
- Maks `prefill` 500 karakter.

## Global Constraints

- Build/deploy wajib staging build terpisah (`./scripts/deploy.sh`), commit + push.
- Jangan simpan kredensial; iframe publik, sesi ditangani Yuki lewat cookie httpOnly.
- Jangan hapus pengecualian sembunyi widget (`/chapter`, `/scanlator`, `/aturan`) untuk FAB biasa.
- Jangan auto-send pertanyaan; user wajib tekan kirim sendiri.
- Semua ikon pakai `lucide-react` / `react-icons`; tanpa emoji di UI.

## Tugas 1 — Helper URL + tombol kontekstual (kecil)

- [ ] **Step 1: Tambah helper `buildYukiUrl(ctx, prefill?)` di `src/lib/yukiEmbed.ts`** — gabung `ctx`/`prefill` ke URL embed, maks ctx 200 & prefill 500, `encodeURIComponent`, fallback URL tanpa param bila kosong.
- [ ] **Step 2: Buat `src/components/AskYukiButton.tsx`** — tombol “Tanya Yuki” dengan props di atas; on click dispatch `window.dispatchEvent(new CustomEvent("open-yuki", { detail: { ctx, prefill } }))`.
- [ ] **Step 3: Verifikasi** — `npx tsc --noEmit --pretty false` lolos; tidak ada perubahan perilaku di FAB biasa.

## Tugas 2 — Buka widget dari tombol kontekstual (termasuk halaman chapter)

- [ ] **Step 1: Ubah `YukiChatEmbed.tsx`** — dengarkan event `open-yuki`; saat diterima buka panel walau path masuk daftar sembunyi; set `askPayload`; URL iframe pakai helper dari Tugas 1.
- [ ] **Step 2: Tempel tombol di detail & chapter** — `DetailClient.tsx` dan `ChapterClient.tsx` sesuai lokasi di File yang dibuat/diubah; pastikan tidak menutupi tombol simpan/tab dan nyaman di 390px.
- [ ] **Step 3: Verifikasi browser** — buka halaman detail + chapter, klik “Tanya Yuki”, `iframe[title="Yuki"]` punya `src` berisi `ctx=<judul>` dan `prefill=<pertanyaan>`; FAB biasa tetap tidak muncul di `/chapter`.

## Tugas 3 — Verifikasi & deploy

- [ ] **Step 1: Verifikasi end-to-end** — widget tidak stuck di “Menyiapkan Yuki...”; panel termuat; kalau Yuki belum mendukung `prefill`, chat tetap terbuka dengan konteks benar.
- [ ] **Step 2: Deploy** — `npx tsc --noEmit --pretty false`, lalu `./scripts/deploy.sh`; cek `https://ryukomik.my.id/` HTTP 200.
- [ ] **Step 3: Commit + push** — hanya file yang disentuh plan ini.

## Tidak termasuk

- Mengirim pertanyaan otomatis.
- Menampilkan widget FAB di `/chapter` secara permanen.
- Perubahan kode sisi Yuki.
