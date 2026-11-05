#!/usr/bin/env bash
# Backup harian database sosial (profiles, komentar sosial, nobar, marathon,
# auth lokal). Disimpan di VPS: /home/ryukomik/backups/ryukomik-social (retensi
# 14 hari), lalu salinan TERENKRIPSI di-upload ke R2 supaya selamat kalau
# VPS-nya mati. .env.local ikut dibackup terenkripsi (tanpanya session login
# + koneksi DB tidak bisa dipulihkan).
set -euo pipefail

cd /home/ryukomik/ryukomik
set -a
. ./.env.local
set +a

if [ -z "${SOCIAL_DATABASE_URL:-}" ]; then
  echo "$(date -Is) ERROR: SOCIAL_DATABASE_URL kosong" >&2
  exit 1
fi

DEST=/home/ryukomik/backups/ryukomik-social
mkdir -p "$DEST"
chmod 700 "$DEST"
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$DEST/social-$STAMP.dump"

/usr/bin/pg_dump "$SOCIAL_DATABASE_URL" --format=custom --no-owner --no-privileges --file="$FILE"
# Pastikan arsip benar-benar bisa dibaca sebelum file lama dihapus.
pg_restore --list "$FILE" >/dev/null
chmod 600 "$FILE"

find "$DEST" -name 'social-*.dump' -type f -mtime +14 -delete

# ── Offsite: upload dump + env terenkripsi ke R2 ──────────────────────────
# Gagal upload tidak menggagalkan backup lokal (exit tetap 0), tapi dicatat
# di .last-offsite.json supaya terlihat di dashboard admin.
OFFSITE_STATUS="$DEST/.last-offsite.json"
UPLOAD_LOG=$(mktemp)
if node --env-file=.env.local scripts/upload-backup-r2.mjs "$FILE" "backups/social/$(basename "$FILE").enc" >"$UPLOAD_LOG" 2>&1 \
   && node --env-file=.env.local scripts/upload-backup-r2.mjs .env.local "backups/env/env-$STAMP.local.enc" >>"$UPLOAD_LOG" 2>&1; then
  printf '{"ok":true,"at":"%s","detail":"dump+env terenkripsi di R2"}\n' "$(date -Is)" > "$OFFSITE_STATUS"
  echo "$(date -Is) offsite ok $(cat "$UPLOAD_LOG" | tr '\n' ' ')"
else
  printf '{"ok":false,"at":"%s","detail":%s}\n' "$(date -Is)" "$(python3 -c 'import json,sys; print(json.dumps(open(sys.argv[1]).read()[-300:]))' "$UPLOAD_LOG")" > "$OFFSITE_STATUS"
  echo "$(date -Is) offsite GAGAL (backup lokal tetap aman): $(tail -2 "$UPLOAD_LOG" | tr '\n' ' ')"
fi
rm -f "$UPLOAD_LOG"
chmod 600 "$OFFSITE_STATUS" 2>/dev/null || true

echo "$(date -Is) ok $(du -h "$FILE" | cut -f1) $FILE"
