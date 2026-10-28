#!/usr/bin/env bash
# Build produksi Ryukomik dengan staging + pembersihan build lama.
#
# Kenapa staging: `next build` langsung ke .next pernah gagal ENOTEMPTY dan
# membuat situs 502. Build ditaruh di .next-staging, lalu ditukar hanya kalau
# build sukses.
#
# Kenapa build lama dihapus di akhir: .next-old-* masing-masing ~0,3-1,2 GB.
# Kalau dibiarkan, disk penuh (pernah 97%) dan build berikutnya gagal ENOSPC.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== build staging =="
rm -rf .next-staging
NEXT_DIST_DIR=.next-staging npm run build
BUILD=$?

if [ $BUILD -ne 0 ]; then
  echo "build gagal, .next lama dibiarkan" >&2
  rm -rf .next-staging
  exit $BUILD
fi

TS=$(date +%s)
mv .next ".next-old-$TS"
mv .next-staging .next
pm2 restart ryukomik --update-env >/dev/null 2>&1 || true

# Jangan simpan arsip build: cukup satu (yang aktif).
rm -rf .next-old-* .next-staging

echo "== selesai, build lama dibersihkan =="
df -h / | tail -1
