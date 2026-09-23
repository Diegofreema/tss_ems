import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must run before the React plugin so generated routes are transformed.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
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
    // The harness assigns a port when 5173 is taken by another worktree.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    proxy: {
      '/api': {
        target: 'https://bronze.uaes.education',
        changeOrigin: true,
      },
    },
  },
})
