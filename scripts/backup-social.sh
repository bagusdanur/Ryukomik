#!/usr/bin/env bash
# Backup harian database sosial (profiles, komentar sosial, nobar, marathon).
# Disimpan di VPS yang sama: /home/ryukomik/backups/ryukomik-social (retensi 14 hari).
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
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$DEST/social-$STAMP.dump"

/usr/bin/pg_dump "$SOCIAL_DATABASE_URL" --format=custom --no-owner --no-privileges --file="$FILE"
# Pastikan arsip benar-benar bisa dibaca sebelum file lama dihapus.
/usr/bin/pg_restore --list "$FILE" >/dev/null

find "$DEST" -name 'social-*.dump' -type f -mtime +14 -delete

echo "$(date -Is) ok $(du -h "$FILE" | cut -f1) $FILE"
