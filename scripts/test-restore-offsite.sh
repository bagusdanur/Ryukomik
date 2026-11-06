#!/usr/bin/env bash
# Verifikasi backup OFFSITE (R2, terenkripsi): unduh -> dekripsi -> restore ke
# schema sementara -> bandingkan jumlah baris dengan data live.
set -euo pipefail

cd /home/ryukomik/ryukomik
set -a
. ./.env.local
set +a

RESULT=/home/ryukomik/backups/ryukomik-social/.last-offsite-restore-test.json
SCHEMA=restore_test_offsite
TMP_SQL=$(mktemp /tmp/offsite-restore-XXXXXX.sql)

TABLES=(
  social_profiles auth_users comments user_backup history_sync social_notifications
  scanlator_profiles scanlator_applications scanlator_notifications scanlator_moderation
  scanlator_follows scanlator_chapter_revisions scanlator_deleted scanlator_uploads
  scanlator_rights_confirmations
)
T_ARGS=()
for t in "${TABLES[@]}"; do T_ARGS+=(-t "$t"); done

cleanup() {
  psql "$SOCIAL_DATABASE_URL" -q -c "DROP SCHEMA IF EXISTS \"$SCHEMA\" CASCADE;" >/dev/null 2>&1 || true
  rm -f "$TMP_SQL"
}
trap cleanup EXIT

INFO=$(node scripts/download-latest-offsite.mjs)
DUMP=$(printf '%s' "$INFO" | python3 -c 'import json,sys;print(json.load(sys.stdin)["dumpPath"])')
KEY=$(printf '%s' "$INFO" | python3 -c 'import json,sys;print(json.load(sys.stdin)["key"])')

cleanup
psql "$SOCIAL_DATABASE_URL" -q -c "CREATE SCHEMA \"$SCHEMA\";"
pg_restore -f "$TMP_SQL" "${T_ARGS[@]}" "$DUMP" 2>/dev/null
sed -i "s/\bpublic\./$SCHEMA./g" "$TMP_SQL"
psql "$SOCIAL_DATABASE_URL" -q -v ON_ERROR_STOP=0 -f "$TMP_SQL" >/dev/null 2>&1 || true

MISMATCH=""
JSON_COUNTS=""
for t in "${TABLES[@]}"; do
  RESTORED=$(psql "$SOCIAL_DATABASE_URL" -At -c "select count(*) from $SCHEMA.$t" 2>/dev/null || echo ERR)
  LIVE=$(psql "$SOCIAL_DATABASE_URL" -At -c "select count(*) from public.$t" 2>/dev/null || echo ERR)
  JSON_COUNTS+="\"$t\":{\"restored\":${RESTORED/ERR/0},\"live\":${LIVE/ERR/0}},"
  if [ "$RESTORED" = "ERR" ]; then MISMATCH+="$t(tidak ada) "; continue; fi
  if [ "$LIVE" != "ERR" ]; then
    DIFF=$((LIVE - RESTORED)); TOL=$((LIVE / 100 + 5))
    if [ "$DIFF" -lt 0 ] || [ "$DIFF" -gt "$TOL" ]; then MISMATCH+="$t(restore=$RESTORED live=$LIVE) "; fi
  fi
done

rm -f "$DUMP" /tmp/offsite-latest.enc

if [ -n "$MISMATCH" ]; then
  printf '{"ok":false,"at":"%s","key":"%s","mismatch":"%s","counts":{%s}}\n' "$(date -Is)" "$KEY" "$MISMATCH" "${JSON_COUNTS%,}" > "$RESULT"
  chmod 600 "$RESULT"; echo "OFFSITE MISMATCH: $MISMATCH" >&2; exit 1
fi

printf '{"ok":true,"at":"%s","key":"%s","tables":%d,"counts":{%s}}\n' "$(date -Is)" "$KEY" "${#TABLES[@]}" "${JSON_COUNTS%,}" > "$RESULT"
chmod 600 "$RESULT"
echo "offsite restore-test ok: ${#TABLES[@]} tabel cocok ($KEY)"
