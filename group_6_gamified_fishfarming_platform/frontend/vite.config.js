import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// PWA: service worker caches the app shell + lesson content for offline study
// on low-bandwidth rural connections (proposal §3.4.2).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Fish-Farm Learning',
        short_name: 'FishFarm',
        theme_color: '#0e7490',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/modules') || url.pathname.startsWith('/api/lessons'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'lesson-content' },
          },
        ],
      },
    }),
  ],
  server: { port: 5174 },
})
