# Deploying TSS EMS to cPanel

```bash
./deploy/package.sh
```

That checks the code (typecheck, lint, tests), builds, and produces:

- **`deploy/netpro-ems-cpanel.zip`** — about 2.1 MB, 462 files. Upload this.
- `deploy/build/` — the same thing unzipped, if you would rather upload a folder.

The script refuses to package if `VITE_API_URL` is set in your shell (the
bundle would call that instead of its own host), if the bundle does not call
`/backend/api`, or if a `.env` file or a source map found its way in.

---

## Where it goes

**In the portal's own document root, beside the school's `backend/` folder —
not `public_html`.**

`portal.tss.sch.ng` is its own site on this cPanel account, with its own
folder. The backend's error traces name it: `/home/tsssch/portal.tss.sch.ng/`.
`public_html` belongs to the account's main domain, so the zip extracted there
would publish the portal on the wrong website and `/backend` would not be
beside it. To confirm the folder: cPanel → **Domains** → the row for
`portal.tss.sch.ng` → **Document Root**.

On 2026-09-24 that folder held exactly one thing, `backend/`, and the server
listed it to anyone who opened the address ("Index of /"). The `.htaccess` in
this package switches listings off.

When it is done the folder looks like:

```
portal.tss.sch.ng/
  .htaccess                ← routes, compression, caching, https
  index.html
  sw.js, workbox-*.js      ← the service worker (offline support)
  manifest.webmanifest
  *.png, *.webp, icons.svg
  assets/
    .htaccess              ← one-year cache for the hashed bundles
    …                      (≈445 files)
  backend/                 ← the school's API — untouched, not in the zip
```

## Upload

1. cPanel → **File Manager** → open the portal's document root (above).
2. **Settings → Show Hidden Files (dotfiles)**. The two `.htaccess` files are
   hidden otherwise, and a missing one is the usual reason for "every page
   except the first gives 404".
3. **Upload** `netpro-ems-cpanel.zip`, then right-click it → **Extract** into
   the same folder. Say yes to overwriting.
4. Check both `.htaccess` and `assets/.htaccess` are there, then delete the zip.
5. Open `https://portal.tss.sch.ng` — it should land on the sign-in page with
   **Apply for admission** under the Login button.

The zip never contains a `backend/` folder, so extracting cannot touch the API.

### After the first upload, check offline support

In Chrome on a real machine: DevTools → **Application → Service Workers**
should show `sw.js` as **activated**. This is the one thing that could not be
tested before upload — the browser used for testing blocks service workers
outright (an empty two-line worker fails the same way), so it proves nothing
either way about this build.

---

## Redeploying

Run `./deploy/package.sh` again and extract over the top. Leave old files in
`assets/`: a tab still running the previous build may ask for one of its own
chunks, and it is harmless for it to still be there. The service worker is
`registerType: 'prompt'`, so people are _offered_ the new version rather than
reloaded mid-task — which matters to a teacher halfway through a register.

---

## What the `.htaccess` does

`deploy/cpanel/.htaccess` (root) and `deploy/cpanel/assets/.htaccess`, copied
in by the script. In order:

| Rule                                           | Why                                                                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| No directory listings                          | The root listed its folders to anybody.                                                                                            |
| http → https                                   | The service worker and the device's database need a secure context; over http there is no offline at all.                          |
| `/backend` passed through                      | The app's route fallback must never answer an API call with `index.html`. The backend's own `.htaccess` wins anyway; this is insurance. |
| Everything else that is not a file → `index.html` | `/admin/students`, `/apply` and every other address are the app's routes, not folders.                                         |
| No rewriting inside `assets/`                  | A missing chunk is a real 404, not `index.html` sent back as JavaScript (a MIME error nobody can read).                             |
| MIME types                                     | Apache does not know `.webmanifest`, and without it the app will not install.                                                      |
| gzip                                           | The host compressed nothing (measured). About 6.5 MB of JavaScript as built, roughly a quarter of that over the wire.               |
| `index.html`, `sw.js`, manifest: never cached  | Otherwise browsers keep the old build after a deploy and nothing can reach them to say so. Do not "optimise" this.                  |
| `assets/*`: cached a year, immutable           | Every name in there carries a hash of its contents.                                                                                |
| Root images: cached a day                      | They keep their names across builds, so a year would pin an old icon.                                                              |
| Security headers                               | `nosniff`, `SAMEORIGIN`, a referrer policy, no camera/mic/location.                                                                |

The rewrite rules use `[END]`, not `[L]`: in `.htaccess`, `[L]` _restarts_ the
ruleset with the rewritten address rather than stopping. `[END]` is Apache 2.4+,
which the host runs.

### Verified before shipping (2026-09-24)

The zip itself was extracted and served by Apache 2.4.67 with only these two
`.htaccess` files doing the work, `/backend/api` forwarded to the live school:

| Check                                                                | Result                                   |
| -------------------------------------------------------------------- | ---------------------------------------- |
| `/` → sign-in page, Apply for admission shown                        | ✅                                       |
| Deep links (`/admin/students/new`, `/apply`) → the app, not 404      | ✅                                       |
| `index.html`, `sw.js`, manifest → `no-store`                         | ✅                                       |
| Hashed JS/CSS/fonts → `max-age=31536000, immutable`                  | ✅                                       |
| `pwa-maskable-512.png` → one day, not one year                       | ✅                                       |
| Missing `assets/…js` → 404, not `index.html`                         | ✅                                       |
| `/backend/…` passed through; a missing backend path → 404            | ✅                                       |
| HTML, JS, CSS, manifest served gzipped                               | ✅                                       |
| Plain http → 301 to https                                            | ✅                                       |
| `.webmanifest` served as `application/manifest+json`                 | ✅                                       |
| The apply form's class list loads from the live school               | ✅                                       |
| Service worker registers                                             | ⚠️ not testable here — check after upload |

---

## The host, as measured on 2026-09-24

| What                  | State                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Server                | Apache                                                                                                 |
| Certificate           | ✅ Let's Encrypt, renewed 23 Sep 2026, valid to **22 Dec 2026**. AutoSSL should renew it; if it lapses, cPanel → SSL/TLS Status → Run AutoSSL. |
| API                   | ✅ `https://portal.tss.sch.ng/backend/api` — up. CakePHP, same host as the portal.                       |
| Compression           | ❌ none from the host — the `.htaccess` turns it on.                                                     |
| ModSecurity           | On. It answers **406** to requests without a browser user agent, so test with `curl -A "Mozilla/5.0 …"` rather than plain `curl`. |

A healthy API check (a 401 is the right answer with no token):

```bash
curl -s -A "Mozilla/5.0" https://portal.tss.sch.ng/backend/api/users/me
```

### ⚠️ The backend prints PHP warnings into its answers

On student creates and edits, `POST /students` answers with about 58 KB of
CakePHP deprecation HTML (`allowEmpty()` and `notEmpty()` in
`StudentsTable.php`, lines 180 and 186) in front of the JSON. The app now reads
past it (`src/api/envelope.ts`), but every such answer is 58 KB heavier than it
should be, and any client other than this one will fail to parse it. **Fix on
the server:** set `debug` to `false` in the backend's `config/app.php` (or
`app_local.php`), which is how a live CakePHP site should run anyway.

---

## Requirements on the host

| Need          | Why                                      | If missing                                             |
| ------------- | ---------------------------------------- | ------------------------------------------------------ |
| `mod_rewrite` | The app's routes                         | Only the first page works                              |
| `mod_headers` | Caching and security headers             | Works, but browsers may keep a stale build             |
| `mod_deflate` | Compression                              | Works, but the first visit is ~4× heavier              |
| HTTPS         | Service workers require a secure context | **No offline support at all**                          |

Each block in the `.htaccess` is wrapped in `<IfModule>`, so a missing module
drops its feature rather than taking the site down with a 500.

---

## If the API ever moves to another domain

The app calls `/backend/api` on its own host, set in four places that must
agree:

| Where                             | What                                                                        |
| --------------------------------- | --------------------------------------------------------------------------- |
| `src/api/client.ts`               | `${location.origin}/backend/api` (override with `VITE_API_URL`)             |
| `vite.config.ts` → `server.proxy` | dev only — forwards `/backend` to the live host                             |
| `vite.config.ts` → workbox        | `navigateFallbackDenylist` and the `NetworkOnly` rule both match `/backend` |
| `deploy/cpanel/.htaccess`         | passes `/backend` through, so the route fallback cannot swallow it          |

`deploy/cpanel/api/index.php` is a PHP forwarder kept for that case and **not**
shipped: restore an `/api` rule in `.htaccess`, copy the file in, and point its
`$UPSTREAM` at the new host.

## Subdirectory hosting

Everything assumes the app sits at the root of its domain. Serving it from
`example.com/portal/` needs `base: '/portal/'` in `vite.config.ts`, matching
PWA `scope`, `start_url` and `navigateFallback`, and the `.htaccess` paths.
Not done here.

## Uploads

If large file uploads fail, raise `upload_max_filesize` and `post_max_size` in
cPanel → **MultiPHP INI Editor** for the portal's domain.

---

## Security note

`.env` in the project root holds **real login credentials in plain text**. It is
git-ignored, is not read into the bundle (Vite only exposes `VITE_` variables),
and `package.sh` refuses to ship one — but those passwords should still be
rotated if that machine is shared or backed up anywhere.
