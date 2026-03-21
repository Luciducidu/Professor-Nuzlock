import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const basePath = '/Professor-Nuzlock/'

export default defineConfig({
  base: basePath,
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  plugins: [
    react(),
    VitePWA({
      base: basePath,
      scope: basePath,
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      includeManifestIcons: true,
      manifestFilename: 'manifest.webmanifest',
      manifest: {
        name: 'Professor Nuzlock',
        short_name: 'Nuzlock',
        description: 'Nuzlocke-Tracker für Pokémon',
        start_url: '.',
        scope: basePath,
        display: 'standalone',
        background_color: '#f1f5f9',
        theme_color: '#0f172a',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: `${basePath}index.html`,
        navigateFallbackDenylist: [/\/assets\//, /\/icons\//, /\/sprites\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith(`${basePath}sprites/`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'sprites-cache',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              /pokemonIndex\.json$/i.test(url.pathname) || /\/assets\/.*\.json$/i.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pokemon-data-cache',
            },
          },
        ],
      },
    }),
  ],
})
