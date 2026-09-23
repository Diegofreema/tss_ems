import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must run before the React plugin so generated routes are transformed.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    /**
     * The app shell, cached so a reload with no signal still starts.
     *
     * Local-first is worth nothing if the page itself has to be fetched: a
     * teacher who reloads in a classroom with no signal would get the
     * browser's offline page and never reach the register saved on their own
     * device. This is what makes the rest of it true.
     */
    VitePWA({
      // Not `autoUpdate`: that takes over and reloads the page as soon as a new
      // build lands, and this app is used by somebody halfway through marking
      // thirty students. The new version waits and is offered instead.
      registerType: 'prompt',
      // No `includeAssets`: `globPatterns` below already takes every svg and
      // png in `public/`, and naming them twice puts them in the manifest twice.
      manifest: {
        name: 'TSS EMS',
        short_name: 'NETPRO',
        description:
          'The school portal — registers, results, fees and timetables, on your device.',
        /*
         * The sign-in form, not the landing page.
         *
         * The landing page is a shopfront: what the school is, what the
         * portal does, and a Sign in button at the end of it. Somebody who
         * has installed the app has already been sold — they tapped the icon
         * to get at a register or a result, and being shown the pitch again
         * with the one control they want a scroll away is the tax the web
         * pays and an installed app should not.
         *
         * `scope` stays at the root, so every portal underneath is still the
         * app rather than a link out to the browser.
         *
         * This alone only reaches installs made from here on — a device that
         * already has the app keeps the `start_url` its manifest was
         * installed with. `installedApp()` is what covers those, redirecting
         * the landing route when the app is running standalone.
         */
        start_url: '/sign-in',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        // --ems-brand in index.css. The splash screen and the task-switcher
        // chrome of an installed app are drawn from this.
        theme_color: '#356ead',
        orientation: 'portrait-primary',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,wasm}'],
        /**
         * The SQLite worker is cached, but not up front.
         *
         * It carries wa-sqlite's wasm inlined as a data URI — 689 KB gzipped,
         * measured — and precaching downloads it during service worker install,
         * on the first visit, competing with the app itself for a connection
         * that on a Nigerian 3G link has none to spare. It is not needed to
         * render anything: `bootstrapDb` gives up after 1.5s and the first
         * visit simply runs from the network, as this app always has.
         *
         * So it is fetched when it is first actually wanted and kept from then
         * on, which makes every visit after the first one durable and instant.
         */
        globIgnores: ['**/opfs-worker-*.js'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        // A navigation is a page; `/api` is not, and must never be answered
        // from the shell.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            /**
             * The school's own answers are never cached here.
             *
             * The device's database is the cache. A second one, kept by the
             * service worker on different rules, would disagree with it — and
             * the reader would have no way of telling which of the two they
             * were looking at.
             */
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
          {
            // The other half of the decision above: downloaded once, then kept.
            urlPattern: /\/assets\/opfs-worker-[^/]*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sqlite-worker',
              expiration: { maxEntries: 2 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Off in dev: a service worker caching a dev server's modules is a
        // day of confusing staleness for no benefit.
        enabled: false,
      },
    }),
  ],
  // Pre-bundling nuqs splits it and its adapter into two chunks, each with a
  // private copy of the adapter context ("Multiple adapter contexts detected"
  // in dev). Serving it unbundled keeps one context. Production is unaffected.
  optimizeDeps: {
    exclude: ['nuqs'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // The API sends no Access-Control-Allow-Origin, so no browser may call it
  // directly. Proxying keeps dev requests same-origin; production does the
  // same thing through the `/api` rewrite in vercel.json. Both must point at
  // the same host, or dev and production talk to different schools.
  server: {
    // Honour an assigned port (tooling sets PORT to run a second dev server
    // beside the usual one); Vite's own default stands otherwise.
    port: Number(process.env.PORT) || undefined,
    proxy: {
      '/api': {
        target: 'https://bronze.uaes.education',
        changeOrigin: true,
      },
    },
  },
});
