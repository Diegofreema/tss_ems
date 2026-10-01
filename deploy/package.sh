#!/usr/bin/env bash
# Builds TSS EMS and assembles the cPanel deployment package.
#
#   ./deploy/package.sh
#
# Produces deploy/build/ (upload its CONTENTS) and deploy/netpro-ems-cpanel.zip
# (upload and extract this instead, which is easier in cPanel File Manager).
# See docs/DEPLOY-CPANEL.md for where it goes.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/deploy/build"
ZIP="$ROOT/deploy/netpro-ems-cpanel.zip"

cd "$ROOT"

# A VITE_API_URL left in the shell would be baked into the bundle, and the
# package would call wherever it pointed rather than /backend on its own host.
if [ -n "${VITE_API_URL:-}" ]; then
  echo "VITE_API_URL is set ($VITE_API_URL). Unset it to build for cPanel." >&2
  exit 1
fi

echo "==> Checking"
pnpm typecheck
pnpm lint
pnpm test >/dev/null

echo "==> Building"
pnpm build

echo "==> Assembling $OUT"
rm -rf "$OUT" && mkdir -p "$OUT"
cp -R dist/. "$OUT"/
cp deploy/cpanel/.htaccess "$OUT/.htaccess"
cp deploy/cpanel/assets/.htaccess "$OUT/assets/.htaccess"
# api/index.php is NOT copied: the API is same-origin at /backend, so there is
# nothing to proxy. deploy/cpanel/api/index.php is kept for the cross-origin
# case (backend on another domain) — see docs/DEPLOY-CPANEL.md.

echo "==> Verifying the package"
for f in index.html .htaccess assets/.htaccess sw.js manifest.webmanifest; do
  [ -f "$OUT/$f" ] || { echo "MISSING: $f" >&2; exit 1; }
done
# The built bundle must call the API on its own origin.
grep -qr "/backend/api" "$OUT/assets" || { echo "build does not reference /backend/api" >&2; exit 1; }
# Nothing from the project root that is not the app: credentials, source maps.
if find "$OUT" -name '.env*' -o -name '*.map' | grep -q .; then
  echo "package contains .env or source maps:" >&2
  find "$OUT" -name '.env*' -o -name '*.map' >&2
  exit 1
fi

echo "==> Zipping"
rm -f "$ZIP"
( cd "$OUT" && zip -rq "$ZIP" . -x '*.DS_Store' )

echo
echo "Done."
echo "  folder: $OUT  ($(find "$OUT" -type f | wc -l | tr -d ' ') files)"
echo "  zip:    $ZIP  ($(du -h "$ZIP" | cut -f1))"
echo
echo "Upload the zip to the portal's document root (beside backend/) and Extract."
echo "Remember: .htaccess is a hidden file — turn on hidden files in File Manager."
