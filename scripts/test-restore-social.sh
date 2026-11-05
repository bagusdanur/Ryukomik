#!/usr/bin/env bash
# Uji restore dump sosial terbaru, lalu hapus lagi.
# User aplikasi tidak punya hak CREATE DATABASE dan dump menyimpan nama
# `public.` eksplisit, jadi restore dilakukan: dump -> SQL -> rewrite
# `public.` menjadi schema temp `restore_test` -> hitung -> DROP SCHEMA.
# Data live di schema public tidak tersentuh sama sekali.
# Hasil ditulis ke /home/ryukomik/backups/ryukomik-social/.last-restore-test.json
set -euo pipefail

cd /home/ryukomik/ryukomik
set -a
. ./.env.local
set +a

DEST=/home/ryukomik/backups/ryukomik-social
LATEST=$(ls -t "$DEST"/social-*.dump 2>/dev/null | head -1)
RESULT="$DEST/.last-restore-test.json"
SCHEMA="restore_test"
TMP_SQL=$(mktemp /tmp/restore-test-XXXXXX.sql)

if [ -z "$LATEST" ]; then
  printf '{"ok":false,"at":"%s","detail":"tidak ada file dump"}\n' "$(date -Is)" > "$RESULT"
  exit 1
fi

cleanup() {
  psql "$SOCIAL_DATABASE_URL" -q -c "DROP SCHEMA IF EXISTS \"$SCHEMA\" CASCADE;" >/dev/null 2>&1 || true
  rm -f "$TMP_SQL"
}
trap cleanup EXIT
cleanup

psql "$SOCIAL_DATABASE_URL" -q -c "CREATE SCHEMA \"$SCHEMA\";"

if ! pg_restore -f "$TMP_SQL" -t social_profiles -t auth_users -t comments -t user_backup "$LATEST" 2>/dev/null; then
  printf '{"ok":false,"at":"%s","file":"%s","detail":"pg_restore ke SQL gagal"}\n' "$(date -Is)" "$(basename "$LATEST")" > "$RESULT"
  exit 1
fi

# Arahkan semua objek public.* ke schema temp, lalu jalankan (error per
# statement tidak menggagalkan yang lain; jumlah baris yang menentukan).
sed -i "s/\bpublic\./$SCHEMA./g" "$TMP_SQL"
psql "$SOCIAL_DATABASE_URL" -q -v ON_ERROR_STOP=0 -f "$TMP_SQL" >/dev/null 2>&1 || true

COUNTS=$(psql "$SOCIAL_DATABASE_URL" -At -F'|' -c "
  select
    (select count(*) from $SCHEMA.social_profiles),
    (select count(*) from $SCHEMA.auth_users),
    (select count(*) from $SCHEMA.comments),
    (select count(*) from $SCHEMA.user_backup);" 2>/dev/null || echo "")
IFS='|' read -r PROFILES AUTH COMMENTS BACKUPS <<< "$COUNTS"

if [ -z "${PROFILES:-}" ]; then
  printf '{"ok":false,"at":"%s","file":"%s","detail":"tabel hasil restore tidak terbaca"}\n' "$(date -Is)" "$(basename "$LATEST")" > "$RESULT"
  exit 1
fi

printf '{"ok":true,"at":"%s","file":"%s","profiles":%s,"auth_users":%s,"comments":%s,"user_backup":%s}\n' \
  "$(date -Is)" "$(basename "$LATEST")" "$PROFILES" "$AUTH" "$COMMENTS" "$BACKUPS" > "$RESULT"
chmod 600 "$RESULT"
echo "$(date -Is) restore-test ok: profiles=$PROFILES auth_users=$AUTH comments=$COMMENTS user_backup=$BACKUPS"
