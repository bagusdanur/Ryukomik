# Channel Notifikasi Scanlator — Implementation Plan

**Goal:** Tambah channel Discord baru `#・scanlator-update` tepat di bawah `#・update-project`, dan alirkan notifikasi chapter/seri baru dari tim Scanlator ke channel itu (lengkap dengan nama tim + link langsung ke chapter), tanpa mengganggu notifikasi project umum yang sudah ada.

**Tech Stack:** Python 3 + discord.py (RyukomikBot), Next.js API routes + project-db outbox (`project_discord_events`).

---

## Konteks & temuan (dasar kenapa perlu channel terpisah)

- Pengumuman Discord sekarang hanya dipanggil dari jalur dashboard admin (`/api/admin/project/chapter`, `/api/admin/project/manga`). Jalur ACC Scanlator (`/api/admin/scanlator/review`) menulis langsung ke project-db dan **tidak pernah** meng-enqueue event.
- Bukti data: dari 737 event `chapter_published`, **0** berasal dari project milik Scanlator (749 event dari project admin, 5 `project_published` scanlator dari toggle dashboard).
- Embed pengumuman sekarang selalu tombol ke `/komik/project/<slug>` (halaman seri), bukan ke chapter — untuk update chapter pembaca harus mencari sendiri.
- `@everyone` dipakai untuk semua tipe event, termasuk project dihentikan/dibatalkan.
- Payload event tidak membawa identitas tim, jadi pengumuman tidak menyebut TL-nya.
- Layout Discord: kategori `PROJECT_CATEGORY_ID = 1524467630868664371` berisi `#・new-project` (`1524467686665621607`), `#・update-project` (`1524467702960488470`), `#・project-drop` (`1524467707079163908`), `#・request-project` (`1531572730715967502`).

## Keputusan produk (default; bisa diubah sebelum eksekusi)

| Hal | Keputusan |
|---|---|
| Nama channel | `#・scanlator-update` (env `SCANLATOR_UPDATE_CHANNEL_NAME`) |
| Posisi | Di dalam kategori Notifikasi Project, tepat setelah `#・update-project` |
| Isi channel | Chapter baru dari tim Scanlator + seri baru tim Scanlator |
| Mention | Chapter baru → **role** saja. Seri baru → `@everyone` + role |
| Tombol | Chapter → `/chapter/project/<slug>/chapter-<n>` · Seri → `/komik/project/<slug>` |
| Atribusi | Nama tim + `@handle` tampil di embed |
| Isi lama | Tidak di-backfill (chapter yang sudah terbit tidak diumumkan ulang) |
| Fallback | Kalau channel/ID belum ada → kirim ke `#・update-project` + log warning |

## Alur setelah perubahan

```
ACC chapter (web)  → project-db: project_discord_events
                     ├─ scanlator_chapter_published   (selalu)
                     └─ scanlator_series_published    (hanya saat seri pertama kali terbit)
Bot poll 5 menit   → build embed (tim + link chapter) → #・scanlator-update
Dashboard admin    → publish chapter project admin → chapter_published → #・update-project (tetap)
```

Satu sumber event per aksi: kalau project punya `owner_user_id`, dashboard juga meng-enqueue tipe `scanlator_*` (bukan `chapter_published`), supaya tidak ada pengumuman ganda.

---

## Task 1 — Buat channel di Discord

**Objective:** Channel baru ada di kategori Notifikasi Project, di bawah `#・update-project`.

**Files:** tidak ada (aksi Discord, dilakukan sekali).

**Step 1:** Jalankan helper yang akan dibuat di Task 3 (idempoten), atau buat manual di Discord dengan nama `・scanlator-update` di kategori Notifikasi Project, posisi tepat setelah `#・update-project`.

**Step 2:** Copy channel ID (klik kanan → Copy Channel ID) → catat untuk Task 2.

**Verifikasi:** `#・scanlator-update` tampil persis di bawah `#・update-project`; @everyone bisa membaca, bot punya izin Send Messages.

---

## Task 2 — Konfigurasi channel baru

**Files:** Modify `/home/ryukomik/RyukomikBot/config.py` (setelah baris 24), Modify `/home/ryukomik/RyukomikBot/.env`

**Step 1:** Tambah di `config.py`:

```python
SCANLATOR_UPDATE_CHANNEL_ID = int(os.getenv("SCANLATOR_UPDATE_CHANNEL_ID", "0")) or None
SCANLATOR_UPDATE_CHANNEL_NAME = os.getenv("SCANLATOR_UPDATE_CHANNEL_NAME", "・scanlator-update")
```

**Step 2:** Tambah di `.env`:

```
SCANLATOR_UPDATE_CHANNEL_ID=<id dari Task 1>
```

**Step 3:** Verifikasi:

```bash
cd /home/ryukomik/RyukomikBot && python3 -c "import config; print(config.SCANLATOR_UPDATE_CHANNEL_ID, config.SCANLATOR_UPDATE_CHANNEL_NAME)"
```

Expected: `<id> ・scanlator-update`

---

## Task 3 — Helper `ensure_scanlator_update_channel`

**Objective:** Channel dibuat otomatis kalau hilang, dan posisinya selalu di bawah `#・update-project`.

**Files:** Modify `/home/ryukomik/RyukomikBot/server_management.py` (setelah `ensure_project_scout_channel`, ± baris 122)

**Step 1:** Tambah fungsi (meniru pola `ensure_raw_watch_channel`):

```python
async def ensure_scanlator_update_channel(guild: discord.Guild) -> discord.TextChannel | None:
    """Channel notifikasi chapter/seri baru dari tim Scanlator."""
    anchor = _find_text_channel(guild, channel_id=UPDATE_PROJECT_CHANNEL_ID)
    if not anchor:
        return None
    channel = _find_text_channel(guild, names=(SCANLATOR_UPDATE_CHANNEL_NAME,))
    if channel is None:
        channel = await guild.create_text_channel(
            SCANLATOR_UPDATE_CHANNEL_NAME,
            category=anchor.category,
            overwrites=dict(anchor.overwrites),
            topic="Chapter & seri baru dari tim Scanlator Ryukomik. Dikelola otomatis.",
            reason="Memisahkan notifikasi Scanlator dari notifikasi project umum",
        )
    try:
        await channel.edit(position=anchor.position + 1, reason="Menempatkan notifikasi Scanlator di bawah update-project")
    except discord.HTTPException:
        pass
    return channel
```

**Step 2:** Import `SCANLATOR_UPDATE_CHANNEL_NAME` di blok import `server_management.py`, dan panggil di setup hook `bot.py` (dekat `ensure_project_scout_channel`):

```python
        await ensure_scanlator_update_channel(guild)
```

**Verifikasi:** restart bot → channel tetap satu (tidak duplikat) dan posisinya di bawah `#・update-project`.

---

## Task 4 — Embed + routing untuk tipe event Scanlator

**Objective:** Bot mengenali dua tipe event baru dan mengirimnya ke channel baru dengan atribusi tim.

**Files:** Modify `/home/ryukomik/RyukomikBot/project_sync.py`

**Step 1:** Tambah import: `SCANLATOR_UPDATE_CHANNEL_ID`, `SCANLATOR_UPDATE_CHANNEL_NAME` dari `config`.

**Step 2:** Tambah helper URL chapter:

```python
def _chapter_url(payload: dict[str, Any]) -> str:
    slug = str(payload.get("slug") or "").strip("/")
    number = payload.get("chapter_number")
    if slug and number is not None:
        return f"{PROJECT_PUBLIC_URL}/chapter/project/{slug}/chapter-{number}"
    return _project_url(payload)
```

**Step 3:** Tambah cabang di `build_project_embed()` sebelum `else: raise ValueError`:

```python
    elif event_type in ("scanlator_chapter_published", "scanlator_series_published"):
        team = str(payload.get("scanlator_team") or payload.get("scanlator_handle") or "Scanlator")
        channel_id = SCANLATOR_UPDATE_CHANNEL_ID or UPDATE_PROJECT_CHANNEL_ID
        if event_type == "scanlator_series_published":
            heading, color = "Seri Baru · Scanlator", discord.Color.blurple()
            description = f"**{title}** — seri baru dari **{team}**."
            link = _project_url(payload)
        else:
            heading, color = "Chapter Baru · Scanlator", discord.Color.green()
            chapter = payload.get("chapter_number")
            chapter_label = f"Chapter {chapter}" if chapter is not None else "Chapter terbaru"
            description = f"**{title}** — **{chapter_label}** oleh **{team}**."
            if payload.get("chapter_title"):
                description += f"\n{str(payload['chapter_title']).strip()}"
            link = _chapter_url(payload)
```

Lalu di akhir fungsi, tombol memakai `link` (bukan `_project_url(payload)`), dan tambahkan field tim untuk tipe scanlator:

```python
    if event_type.startswith("scanlator_"):
        handle = str(payload.get("scanlator_handle") or "")
        embed.add_field(name="Tim", value=f"{team}" + (f" · @{handle}" if handle else ""), inline=True)
    view.add_item(discord.ui.Button(label="Baca Chapter" if event_type == "scanlator_chapter_published" else "Buka Project",
                                    style=discord.ButtonStyle.link, url=link))
```

**Step 4:** Ubah policy mention di `sync_project_events()` — jangan `@everyone` untuk update chapter:

```python
    everyone_types = {"project_published", "scanlator_series_published"}
    mentions = ["@everyone"] if event.get("event_type") in everyone_types else []
    if notification_role:
        mentions.append(notification_role.mention)
    content = " ".join(mentions) or None
    ...
    allowed_mentions=discord.AllowedMentions(everyone=bool(mentions and mentions[0] == "@everyone"),
                                             users=False,
                                             roles=[notification_role] if notification_role else False)
```

**Verifikasi (tanpa Discord):**

```bash
cd /home/ryukomik/RyukomikBot && python3 -c "
import project_sync as p
for t in ('scanlator_chapter_published','scanlator_series_published'):
    ch, e, _ = p.build_project_embed({'id':1,'event_type':t,'payload':{'slug':'uji-seri','title':'Uji Seri','type':'manhwa','status':'ongoing','chapter_number':5,'scanlator_team':'Hanny Scan','scanlator_handle':'hanny-scanlator'}})
    print(t, ch, '|', e.title, '|', e.description)
"
```

Expected: dua baris, `ch` = id channel baru, judul `Chapter Baru · Scanlator` / `Seri Baru · Scanlator`.

---

## Task 5 — Anti-macet: event gagal tidak boleh memblokir antrean

**Objective:** Kalau satu event gagal dikirim (channel hilang, izin dicabut, tipe tak dikenal), event berikutnya tetap jalan.

**Files:** Modify `/home/ryukomik/RyukomikBot/project_sync.py` (`sync_project_events`)

**Step 1:** Bungkus badan loop per event:

```python
    for event in events:
        try:
            channel_id, embed, view = build_project_embed(event)
            channel = guild.get_channel(channel_id)
            if not isinstance(channel, discord.TextChannel):
                raise RuntimeError(f"channel unavailable: {channel_id}")
            message = await channel.send(content=content, embed=embed, view=view, allowed_mentions=...)
        except Exception as error:  # noqa: BLE001 - antrean tidak boleh macet
            log.warning("project event %s gagal: %s", event.get("id"), error)
            await _record_delivery(event, 0)  # tandai diproses, message_id 0 = gagal
            continue
        await _record_delivery(event, message.id)
        delivered += 1
```

**Verifikasi:** sementara set `SCANLATOR_UPDATE_CHANNEL_ID=999999999999` → bot log menampilkan warning, `project_discord_sync` bertambah (message_id 0), dan event berikutnya tetap terkirim. Kembalikan env setelah uji.

---

## Task 6 — Tipe event baru di web

**Objective:** Web bisa meng-enqueue dua tipe baru.

**Files:** Modify `/home/ryukomik/ryukomik/src/lib/projectDiscordEvents.ts:3-6`

```ts
export type ProjectDiscordEventType =
  | "project_published"
  | "chapter_published"
  | "project_status_changed"
  | "scanlator_chapter_published"
  | "scanlator_series_published";
```

**Verifikasi:** `cd /home/ryukomik/ryukomik && npx tsc --noEmit` → 0 error.

---

## Task 7 — Enqueue dari jalur ACC Scanlator

**Objective:** Setiap ACC chapter Scanlator mengumumkan ke Discord; seri diumumkan sekali saat pertama kali terbit.

**Files:** Modify `/home/ryukomik/ryukomik/src/app/api/admin/scanlator/review/route.ts` (blok `approve_chapter`, ± baris 121-155)

**Step 1:** Tangkap respons PATCH untuk tahu seri baru terbit:

```ts
        const patchResult = await projectApiFetch<{ parent_published?: boolean }>(`/admin/chapters/${body.chapter_id}`, { ... });
```

**Step 2:** Setelah `logChapterRevision`, sebelum notifikasi lain, tambah (best-effort, jangan gagalkan ACC):

```ts
        if (action === "approve_chapter") {
          const snapshot = {
            slug: String(manga.data.slug || ""),
            title: String(manga.data.title || ""),
            cover_url: (manga.data.cover_url as string | null) || "",
            type: (manga.data.type as string | null) || "",
            status: (manga.data.status as string | null) || "",
            genres: Array.isArray(manga.data.genres) ? (manga.data.genres as string[]) : [],
          };
          const team = {
            scanlator_team: String(manga.data.scanlator_team || manga.data.scanlator_handle || ""),
            scanlator_handle: String(manga.data.scanlator_handle || ""),
          };
          const chapterNo = /* chapter_number yang sudah dihitung di blok notifikasi follower */;
          await enqueueProjectDiscordEvent("scanlator_chapter_published", snapshot, {
            chapter_number: chapterNo,
            chapter_title: String(chapterTitle || ""),
            ...team,
          }).catch(() => undefined);
          if (patchResult?.parent_published) {
            await enqueueProjectDiscordEvent("scanlator_series_published", snapshot, team).catch(() => undefined);
          }
        }
```

Import `enqueueProjectDiscordEvent` di file yang sama.

**Verifikasi:** `npx tsc --noEmit` = 0.

---

## Task 8 — Dashboard tetap satu sumber (anti dobel)

**Objective:** Chapter milik Scanlator yang dipublish dari dashboard tidak dikirim dua kali (sekali ke channel umum, sekali ke channel Scanlator).

**Files:** Modify `/home/ryukomik/ryukomik/src/app/api/admin/project/chapter/route.ts` (blok PATCH & POST yang memanggil `enqueueProjectDiscordEvent`, ± baris 69 & 140)

**Step 1:** Tentukan tipe event dari kepemilikan project:

```ts
      const owned = Boolean(manga?.data?.owner_user_id);
      const eventType = owned ? "scanlator_chapter_published" : "chapter_published";
      const extra = owned
        ? { chapter_number: result.data.chapter_number, chapter_title: result.data.title || "",
            scanlator_team: manga?.data?.scanlator_team || "", scanlator_handle: manga?.data?.scanlator_handle || "" }
        : { chapter_number: result.data.chapter_number, chapter_title: result.data.title || "" };
      await enqueueProjectDiscordEvent(eventType, manga!.data, extra);
```

**Verifikasi:** `npx tsc --noEmit` = 0.

---

## Task 9 — Uji end-to-end

**Objective:** Membuktikan chapter Scanlator benar-benar sampai ke channel baru, tanpa duplikat.

**Step 1 (fixture):** buat project + chapter belum terbit milik user Scanlator, `review_status='approved'` (pola fixture yang sudah dipakai untuk uji review).

**Step 2:** Panggil `POST /api/admin/scanlator/review` dengan `action=approve_chapter` (token admin).

**Step 3:** Cek outbox:

```sql
select id, event_type, manga_slug from project_discord_events order by id desc limit 3;
```

Expected: 1 baris `scanlator_chapter_published` (+1 `scanlator_series_published` kalau seri belum pernah terbit), **tidak ada** `chapter_published` untuk slug yang sama.

**Step 4:** Tunggu ≤5 menit (atau jalankan loop manual), lalu:

```bash
python3 -c "
import sqlite3; c=sqlite3.connect('file:data/ryukomik.db?mode=ro',uri=True)
print(c.execute('select event_id,message_id from project_discord_sync order by event_id desc limit 3').fetchall())"
```

Expected: event id baru muncul dengan `message_id > 0`.

**Step 5:** Hapus fixture (chapter, project) dan pastikan tidak ada sisa.

---

## Task 10 — Deploy & catat

**Step 1:** Web: `cd /home/ryukomik/ryukomik && npx tsc --noEmit && ./scripts/deploy.sh` → tunggu home 200.

**Step 2:** Bot: `pm2 restart ryukomik-bot` lalu cek log `[PROJECT]`.

**Step 3:** Commit terpisah per repo:
- `RyukomikBot`: `git add config.py project_sync.py server_management.py bot.py && git commit -m "feat: channel notifikasi scanlator"`
- `ryukomik`: `git add src/lib/projectDiscordEvents.ts src/app/api/admin/scanlator/review/route.ts src/app/api/admin/project/chapter/route.ts && git commit -m "feat: event discord untuk chapter scanlator"`

**Step 4:** `.env` (berisi ID channel) tidak di-commit.

---

## Risiko & catatan

- **Izin bot:** pembuatan channel butuh Manage Channels. Kalau tidak ada, Task 1 dilakukan manual.
- **Salah ID channel:** dengan Task 5 antrean tidak macet (event ditandai gagal). Fallback `SCANLATOR_UPDATE_CHANNEL_ID or UPDATE_PROJECT_CHANNEL_ID` mencegah notifikasi hilang sebelum channel dibuat.
- **Dobel dengan jalur dashboard:** ditutup Task 8 (satu sumber per aksi). Kalau nanti ada jalur publish baru, aturan yang sama wajib diikuti.
- **Tidak ada backfill:** chapter lama tidak diumumkan ulang (menghindari spam 700+ pesan).
- **Mention:** kalau ternyata user ingin `@everyone` juga untuk chapter, cukup ubah `everyone_types` di Task 4.

## Pertanyaan terbuka (jawab sebelum eksekusi)

1. Nama channel: `#・scanlator-update` atau lain?
2. Seri baru Scanlator ikut ke channel ini (default) atau tetap ke `#・new-project`?
3. `@everyone` untuk seri baru: ya (default) atau role saja?
