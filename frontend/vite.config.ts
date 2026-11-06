import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Куда прокси разработки отправляет API (другой порт backend — MILO_API_PROXY). */
const API_PROXY = process.env.MILO_API_PROXY ?? 'http://localhost:3000';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // В мобильном приложении (Capacitor, режим `mobile`) файлы и так лежат внутри APK —
    // service worker PWA не нужен и только мешал бы обновлениям
    mode !== 'mobile' &&
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'favicon.svg', 'favicon-64.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'MILO — питание, кладовая, рецепты и покупки',
          short_name: 'MILO',
          description: 'Питание, кладовая, рецепты и покупки',
          lang: 'ru',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#2F3BD9',
          background_color: '#F4F5FA',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
          navigateFallback: '/index.html',
        },
        devOptions: { enabled: false },
      }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    // Разработка: API и WebSocket поддержки — на backend (npm run dev поднимает оба).
    // Один адрес с фронтендом — без CORS (shared/api: в разработке API — /api/v1)
    proxy: {
      '/api': API_PROXY,
      '/socket.io': { target: API_PROXY, ws: true },
    },
  },
}));
