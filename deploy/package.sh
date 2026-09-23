#!/usr/bin/env bash
# Builds TSS EMS and assembles the cPanel deployment package.
#
#   ./deploy/package.sh
#
# Produces deploy/build/ (upload its CONTENTS) and deploy/netpro-ems-cpanel.zip
# (upload and extract this instead, which is easier in cPanel File Manager).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/deploy/build"
ZIP="$ROOT/deploy/netpro-ems-cpanel.zip"

cd "$ROOT"
echo "==> Building"
pnpm build

echo "==> Assembling $OUT"
rm -rf "$OUT" && mkdir -p "$OUT"
cp -R dist/. "$OUT"/
cp deploy/cpanel/.htaccess "$OUT/.htaccess"
# api/index.php is NOT copied: the API is same-origin at /backend, so there is
# nothing to proxy. deploy/cpanel/api/index.php is kept for the cross-origin
# case (backend on another domain) — see docs/DEPLOY-CPANEL.md.

echo "==> Checking"
for f in index.html .htaccess sw.js manifest.webmanifest; do
  [ -f "$OUT/$f" ] || { echo "MISSING: $f"; exit 1; }
done
# The built bundle must point at the API, not at the old /api proxy path.
grep -qr "/backend/api" "$OUT/assets" || { echo "build does not reference /backend/api"; exit 1; }

echo "==> Zipping"
rm -f "$ZIP"
( cd "$OUT" && zip -rq "$ZIP" . -x '.DS_Store' )

echo
echo "Done."
echo "  folder: $OUT"
echo "  zip:    $ZIP  ($(du -h "$ZIP" | cut -f1))"
echo
echo "Upload the zip to public_html and Extract, or upload the folder's CONTENTS."
echo "Remember: .htaccess is a hidden file — turn on hidden files in File Manager."
