import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'resqph-development-shell-reset',
    apply: 'serve',
    configureServer(server) {
      // Retire an offline production build previously opened on the dev origin.
      // This middleware never runs during a production build or preview.
      server.middlewares.use('/offline-shell.js', (_request, response) => {
        response.setHeader('Content-Type', 'text/javascript')
        response.setHeader('Cache-Control', 'no-store')
        response.end(readFileSync(new URL('./dev/offline-shell-reset.js', import.meta.url), 'utf8'))
      })
    },
  }],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    fs: {
      allow: ['.', '../data'],
    },
  },
  // Local production-build acceptance only; hosted requests use vercel.mjs.
  preview: {
    proxy: process.env.RESQPH_PREVIEW_API_ORIGIN ? {
      '/api': { target: process.env.RESQPH_PREVIEW_API_ORIGIN, changeOrigin: false },
    } : undefined,
  },
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
