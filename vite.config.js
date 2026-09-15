import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'fonts/*.woff2'],
      manifest: {
        name: 'Sabeel — Quran, Hadith, Prayer',
        short_name: 'Sabeel',
        description: 'Quran, Hadith, Prayer times and Dua. Free forever, no ads, no tracking, works offline.',
        theme_color: '#0f1711',
        background_color: '#0f1711',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Our own notificationclick/close handlers, merged into the generated SW.
        importScripts: ['/sw-notifications.js'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: 'CacheFirst',
            // 604 muṣḥaf page layouts, 114 surahs, the dua sets and the hadith
            // indexes. The old cap of 200 was set when there were far fewer, and
            // would now evict pages as fast as they were read — which shows up
            // as a muṣḥaf that only works offline for wherever you happened to
            // be last.
            options: { cacheName: 'sabeel-data', expiration: { maxEntries: 1200 } }
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'sabeel-cdn', expiration: { maxEntries: 60 } }
          },
          {
            urlPattern: /^https:\/\/everyayah\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'sabeel-audio', expiration: { maxEntries: 3000 } }
          },
          {
            urlPattern: /^https:\/\/[^/]*mp3quran\.net\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'sabeel-audio', expiration: { maxEntries: 300 } }
          },
          {
            // The adhan must still sound with no signal, so it is cached the
            // first time it plays and kept.
            urlPattern: /\/adhan\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: { cacheName: 'sabeel-adhan', expiration: { maxEntries: 10 } }
          }
        ]
      }
    })
  ],
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 }
})
