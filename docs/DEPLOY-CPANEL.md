# Deploying TSS EMS to cPanel

Build once, upload, done. Everything here has been exercised locally except
where it says otherwise.

```bash
./deploy/package.sh
```

That produces **`deploy/netpro-ems-cpanel.zip`** (2.2 MB, 455 files).

---

## Where the API is

`https://portal.tss.sch.ng/backend/api` — Laravel is installed at
`/backend` and its own routes carry the `/api` prefix, so the two stack. On the
**same host** as the portal.

Verified live 2026-09-23: `/backend/api/users/me` answers with the envelope,
`/backend/users/me` is a 404 — an HTML one, with **no** CORS header on it.
That matters more than it looks: Laravel's CORS middleware is scoped to the
`api` routes, so calling the wrong path does not read as a 404 in the browser,
it reads as _"No 'Access-Control-Allow-Origin' header is present"_. A CORS
error here is far more often a wrong path than a wrong CORS policy.

The host **does** send CORS headers on `/backend/api/*` now — measured, including
the preflight: `Access-Control-Allow-Origin` reflects the Origin,
`Allow-Methods` covers GET/POST/PUT/PATCH/DELETE/OPTIONS and `Allow-Headers`
includes `Authorization`. So a cross-origin deployment would in principle work.
Same-origin is kept anyway: it is one fewer thing that can be switched off on
the server without anybody here finding out, and the client is written for it.

### ⚠️ The certificate on portal.tss.sch.ng is expired

Measured 2026-09-23. The Let's Encrypt certificate ran from 5 Oct 2025 to
**3 January 2026** and has not been renewed:

```
subject= /CN=portal.tss.sch.ng
notAfter=Jan  3 18:37:45 2026 GMT
```

A browser will not complete the handshake, so no response — and therefore no
CORS header — ever arrives, and the failure is reported as a CORS/network
error rather than as a certificate problem. **Renew it in cPanel → SSL/TLS
Status → Run AutoSSL.** Nothing in the front end can work around this.

Until it is renewed, `vite.config.ts` carries `secure: false` on the dev proxy
so local development can reach the host at all. That line is marked and must be
removed once the certificate is valid.

Set in four places, all of which must agree:

| Where                             | What                                                                        |
| --------------------------------- | --------------------------------------------------------------------------- |
| `src/api/client.ts`               | `${location.origin}/backend/api` (override with `VITE_API_URL`)             |
| `vite.config.ts` → `server.proxy` | dev only — proxies `/backend` to the live host                              |
| `vite.config.ts` → workbox        | `navigateFallbackDenylist` and the `NetworkOnly` rule both match `/backend` |
| `deploy/cpanel/.htaccess`         | passes `/backend` through, so the SPA fallback cannot swallow it            |

The other four entries match on the `/backend` prefix, so they cover
`/backend/api` without change.

### The proxy is no longer shipped

`deploy/cpanel/api/index.php` is kept in the repo but **not** included in the
package. It is the forwarder for a _cross-origin_ backend — if the API ever
moves to another domain, restore the `/api` rule in `.htaccess`, copy the file
back, and point `$UPSTREAM` at it. Same-origin needs none of it.

## Upload

1. cPanel → **File Manager** → `public_html`.
2. Upload `netpro-ems-cpanel.zip`, then right-click → **Extract**.
3. **Settings → Show Hidden Files (dotfiles)** and confirm **`.htaccess`** is
   there. File Manager hides it by default and a missing `.htaccess` is the most
   common cause of "every page except the home page gives 404".
4. Delete the zip.

You should end up with:

```
public_html/
  .htaccess
  index.html
  sw.js
  manifest.webmanifest
  assets/…            (437 files)
  api/index.php       ← the proxy
```

## Requirements on the host

| Need                        | Why                                      | If missing                                                                       |
| --------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| **PHP 8.2+** for the domain | Laravel's own requirement                | **The API returns 500 and nothing works.** This is the current state — see below |
| `mod_rewrite`               | SPA routes                               | Only the home page works                                                         |
| `mod_headers`               | Caching and security headers             | Works, but browsers may cache a stale shell                                      |
| `mod_deflate`               | Compression                              | Works, first load is ~6.5 MB instead of ~1.6 MB                                  |
| HTTPS                       | Service workers require a secure context | **No offline support at all**                                                    |

### ⚠️ The backend is currently down

Measured 2026-09-20, every path under `/backend/` returns:

```
HTTP 500
Composer detected issues in your platform:
Your Composer dependencies require a PHP version ">= 8.2.0".
```

The host is running an older PHP than Laravel needs. **Fix it in cPanel →
MultiPHP Manager → select the domain → set PHP 8.2 or newer → Apply.** Nothing
in the front end can work around this, and until it is fixed the portal will
load and sign-in will fail.

Once it is up, confirm with:

```bash
curl -s https://portal.tss.sch.ng/backend/api/users/me
```

It should answer with the JSON envelope — a 401 _"Authentication required"_ is
the correct, healthy response to a token-free call. Note the `/api`: without it
the same call 404s, and in a browser that 404 surfaces as a CORS error.

---

## What was verified, and how

Tested locally by serving the built package and comparing the proxy's output
against direct calls to the school's API.

| Check                                                         | Result                                      |
| ------------------------------------------------------------- | ------------------------------------------- |
| App builds                                                    | ✅ 449 precache entries, 6.5 MB, no errors  |
| App renders (sign-in, fonts, images, poster)                  | ✅ screenshot                               |
| Deep SPA route (`/admin/students`) returns the shell, not 404 | ✅                                          |
| Hashed assets serve with correct MIME                         | ✅                                          |
| `manifest.webmanifest`, `sw.js` serve                         | ✅                                          |
| Bundle calls `/backend` on its own origin                     | ✅ confirmed in the browser                 |
| No stale `/api` base anywhere in the bundle                   | ✅                                          |
| Service worker excludes `/backend` from the shell fallback    | ✅ both rules present in `sw.js`            |
| typecheck / lint / 1266 tests                                 | ✅ all pass                                 |
| **Live API reachable**                                        | ❌ **500 — backend PHP version, see above** |
| **Service worker registration**                               | ⚠️ **Not verified** — see below             |

### The one unverified thing

**Service workers are disabled in the browser used for testing.** Proved rather
than assumed: registering a deliberately _empty_ service worker failed with the
identical error, so this is the test environment and not the build.

**After your first upload, open the site on a real browser over HTTPS and
check DevTools → Application → Service Workers shows `sw.js` activated.** Until
that is confirmed, treat offline support as unproven. Everything else in the
table above is confirmed.

---

## Two things that bite

### Caching the shell

`.htaccess` marks `index.html`, `sw.js`, `workbox-*.js` and the manifest
**no-store**, and hashed assets immutable for a year. Do not "optimise" this. If
a CDN or a cPanel caching plugin caches `index.html`, users keep the old build
after every deploy and there is no way to reach them to say so.

### `[L]` versus `[END]`

The rewrite rules use `[END]`, not `[L]`. In `.htaccess`, `[L]` _restarts_ the
ruleset with the rewritten URI rather than stopping — which makes the `/api`
rule re-enter itself and the HTTPS redirect unreachable. `[END]` is Apache 2.4+,
which every cPanel host runs.

---

## Redeploying

```bash
./deploy/package.sh
```

Upload and extract over the top. Old hashed assets can be left; they are
harmless and let a tab mid-session finish loading. The service worker is
`registerType: 'prompt'`, so users are _offered_ the new version rather than
being reloaded mid-task — which matters to a teacher halfway through a register.

## Subdirectory hosting

These instructions assume the app is at the **domain root**. Serving it from
`example.com/portal/` needs `base: '/portal/'` in `vite.config.ts` plus matching
changes to the PWA `scope`, `start_url` and `navigateFallback`, and the
`.htaccess` paths. Not done here — ask and it can be made to work.

## Uploads

If file uploads fail with large files, raise `upload_max_filesize` and
`post_max_size` in cPanel → _MultiPHP INI Editor_. The proxy rebuilds multipart
bodies and is bounded by whatever PHP allows.

---

## Security note

`.env` in the project root holds **real login credentials in plain text**. It is
correctly git-ignored and is not in the package or in git history — but it is
still sitting on the development machine, and those passwords should be rotated
if that machine is shared or backed up anywhere.
