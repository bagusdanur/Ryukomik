#!/usr/bin/env bash
# Uji restore dump sosial terbaru, lalu hapus lagi.
# User aplikasi tidak punya hak CREATE DATABASE dan dump menyimpan nama
# `public.` eksplisit, jadi restore dilakukan: dump -> SQL -> rewrite
# `public.` menjadi schema temp `restore_test` -> hitung -> DROP SCHEMA.
# Data live di schema public tidak tersentuh sama sekali.
#
# Sejak fitur Scanlator, tabel scanlator_* ikut diuji: jumlah baris hasil
# restore dibandingkan dengan data live. ok=true hanya kalau semua cocok.
#
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

TABLES=(
  social_profiles auth_users comments user_backup history_sync social_notifications
  scanlator_profiles scanlator_applications scanlator_notifications scanlator_moderation
  scanlator_follows scanlator_chapter_revisions scanlator_deleted scanlator_uploads
  scanlator_rights_confirmations
)

T_ARGS=()
for t in "${TABLES[@]}"; do T_ARGS+=(-t "$t"); done

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

if ! pg_restore -f "$TMP_SQL" "${T_ARGS[@]}" "$LATEST" 2>/dev/null; then
  printf '{"ok":false,"at":"%s","file":"%s","detail":"pg_restore ke SQL gagal"}\n' "$(date -Is)" "$(basename "$LATEST")" > "$RESULT"
  exit 1
fi

# Arahkan semua objek public.* ke schema temp, lalu jalankan.
sed -i "s/\bpublic\./$SCHEMA./g" "$TMP_SQL"
psql "$SOCIAL_DATABASE_URL" -q -v ON_ERROR_STOP=0 -f "$TMP_SQL" >/dev/null 2>&1 || true

JSON_COUNTS=""
MISMATCH=""
for t in "${TABLES[@]}"; do
  RESTORED=$(psql "$SOCIAL_DATABASE_URL" -At -c "select count(*) from $SCHEMA.$t" 2>/dev/null || echo "ERR")
  LIVE=$(psql "$SOCIAL_DATABASE_URL" -At -c "select count(*) from public.$t" 2>/dev/null || echo "ERR")
  JSON_COUNTS+="\"$t\":{\"restored\":${RESTORED/ERR/0},\"live\":${LIVE/ERR/0}},"
  if [ "$RESTORED" = "ERR" ]; then
    MISMATCH+="$t(tidak ada di dump) "
    continue
  fi
  # Dump selalu lebih lama dari data live, jadi restored boleh lebih sedikit
  # sedikit saja (tulisan baru setelah backup). Toleransi 1% atau 5 baris.
  if [ "$LIVE" != "ERR" ]; then
    DIFF=$((LIVE - RESTORED))
    TOL=$(( LIVE / 100 + 5 ))
    if [ "$DIFF" -lt 0 ] || [ "$DIFF" -gt "$TOL" ]; then
      MISMATCH+="$t(restore=$RESTORED live=$LIVE) "
    fi
  fi
done

FILE_NAME=$(basename "$LATEST")
if [ -n "$MISMATCH" ]; then
  printf '{"ok":false,"at":"%s","file":"%s","mismatch":"%s","counts":{%s}}\n' \
    "$(date -Is)" "$FILE_NAME" "$MISMATCH" "${JSON_COUNTS%,}" > "$RESULT"
  chmod 600 "$RESULT"
  echo "MISMATCH: $MISMATCH" >&2
  exit 1
fi

printf '{"ok":true,"at":"%s","file":"%s","tables":%d,"counts":{%s}}\n' \
  "$(date -Is)" "$FILE_NAME" "${#TABLES[@]}" "${JSON_COUNTS%,}" > "$RESULT"
chmod 600 "$RESULT"
echo "restore-test ok: ${#TABLES[@]} tabel cocok dengan data live"
