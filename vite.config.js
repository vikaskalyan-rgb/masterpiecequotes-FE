import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Ask before updating (a toast with "Update"), instead of reloading mid-quote.
      registerType: 'prompt',
      workbox: {
        // Precache the app shell only. The PDF engine, its fonts and the Excel writer are cached
        // the first time they're used, so installing the app stays light.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        globIgnores: ['**/generate-*.js', '**/excel-*.js', '**/*vietnamese*', '**/icon-*.png'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/') && /\.(js|ttf)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'lazy-assets', expiration: { maxEntries: 40 } },
          },
        ],
      },
      manifest: {
        name: 'Masterpiece Quotations',
        short_name: 'MP Quotes',
        description: 'Build and send quotes for Masterpiece Interiors',
        theme_color: '#fafaf8',
        background_color: '#fafaf8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
