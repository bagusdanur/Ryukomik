#!/usr/bin/env bash
# Build produksi Ryukomik dengan staging + pembersihan build lama.
#
# Kenapa staging: `next build` langsung ke .next pernah gagal ENOTEMPTY dan
# membuat situs 502. Build ditaruh di folder staging, lalu ditukar hanya kalau
# build sukses.
#
# Catatan: nama staging TIDAK boleh berawalan ".next" — Next menormalkan distDir
# sehingga pernah menulis ke ".next/.next-staging" dan situs 502.
#
# Kenapa build lama dihapus di akhir: arsip build ~0,3-1,2 GB. Kalau dibiarkan,
# disk penuh dan build berikutnya gagal ENOSPC.
set -euo pipefail

cd "$(dirname "$0")/.."

STAGE="next-staging"
STAMP=$(date +%s)

echo "== build staging =="
rm -rf "$STAGE"
NEXT_DIST_DIR="$STAGE" npm run build

if [ ! -f "$STAGE/BUILD_ID" ]; then
  # Jaga-jaga: cari lokasi build sebenarnya (Next kadang menaruh di .next/…).
  FOUND=$(find . -maxdepth 3 -name BUILD_ID -newermt '-15 minutes' -path "*${STAGE}*" 2>/dev/null | head -1 || true)
  if [ -n "$FOUND" ]; then
    mv "$(dirname "$FOUND")" "$STAGE"
  fi
fi

if [ ! -f "$STAGE/BUILD_ID" ]; then
  echo "build tidak menghasilkan BUILD_ID — .next lama dibiarkan" >&2
  rm -rf "$STAGE"
  exit 1
fi

echo "== tukar build =="
if [ -d .next ]; then mv .next ".next-old-$STAMP"; fi
mv "$STAGE" .next
pm2 restart ryukomik --update-env >/dev/null 2>&1 || true

# Jangan simpan arsip build: cukup satu (yang aktif).
rm -rf .next-old-* "$STAGE"

echo "== selesai, build lama dibersihkan =="
df -h / | tail -1
