#!/usr/bin/env bash
# Perbaiki domain lama yang tertinggal di environment proses PM2.
#
# KENAPA PERLU: PM2 menyimpan env saat proses pertama dijalankan. Setelah domain
# pindah, `pm2 restart --update-env` saja tidak cukup — nilai lama tetap menang
# atas isi .env (dotenv tidak menimpa env yang sudah ada). Akibatnya bot tetap
# menembak domain mati dan notifikasi gagal tanpa error yang terlihat di UI.
#
# Pakai: bash scripts/fix-pm2-domain-env.sh ryukomik-bot ryukomik-dashboard-api ...
# Kalau tanpa argumen, semua app yang berjalan diperiksa.
set -uo pipefail

if [ "$#" -eq 0 ]; then
  mapfile -t APPS < <(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
for p in json.load(sys.stdin):
    if (p.get('pid') or 0) > 0: print(p['name'])")
else
  APPS=("$@")
fi

fix() {
  sed -e 's/api\.ryukomik\.web\.id/api.ryukomik.com/g' \
      -e 's/staff\.ryukomik\.web\.id/staff.ryukomik.com/g' \
      -e 's/storage\.ryukomik\.web\.id/storage.ryukomik.com/g' \
      -e 's/storage\.ryukomik\.my\.id/storage.ryukomik.com/g' \
      -e 's/ryukomik\.web\.id/ryukomik.com/g' \
      -e 's/ryukomik\.my\.id/ryukomik.com/g' \
      -e 's/\(^\|[^.]\)ryukomik\.id/\1ryukomik.com/g'
}

for app in "${APPS[@]}"; do
  PID=$(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
for p in json.load(sys.stdin):
    if p['name']=='$app': print(p['pid']); break" 2>/dev/null)
  if [ -z "${PID:-}" ] || [ "$PID" = "0" ]; then
    echo "  [$app] tidak berjalan, dilewati"
    continue
  fi

  found=0
  while IFS= read -r line; do
    key=${line%%=*}
    val=${line#*=}
    new=$(printf '%s' "$val" | fix)
    if [ "$new" != "$val" ]; then
      export "$key=$new"
      echo "    $key: $val -> $new"
      found=$((found + 1))
    fi
  done < <(sudo tr '\0' '\n' < "/proc/$PID/environ" 2>/dev/null | grep -E 'ryukomik\.(web|my)\.id|(^|[^.])ryukomik\.id' | grep -v '^_=')

  if [ "$found" -gt 0 ]; then
    pm2 restart "$app" --update-env >/dev/null 2>&1
    echo "  [$app] $found variabel diperbaiki, di-restart"
  else
    echo "  [$app] bersih"
  fi
done
