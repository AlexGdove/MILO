import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Куда прокси разработки отправляет API (другой порт backend — MILO_API_PROXY). */
const API_PROXY = process.env.MILO_API_PROXY ?? 'http://localhost:3000';

/**
 * HTTPS для разработки (`MILO_HTTPS=1 npm run dev`, решение №67): камера (сканер штрихкода) работает
 * только на защищённой странице, а телефон открывает локалку по IP без HTTPS.
 */
const DEV_HTTPS = process.env.MILO_HTTPS === '1';

/** Версия приложения (решение №48) — из package.json, разносит `npm run version:sync`. */
const APP_VERSION = (
  JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

export default defineConfig(({ mode }) => ({
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION) },
  plugins: [
    react(),
    DEV_HTTPS && basicSsl(),
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
          // Заранее — только кириллица и латиница: остальные начертания (вьетнамский, символы…)
          // браузер скачивает лишь для таких символов на экране (unicode-range) — ниже кэш
          globIgnores: ['**/*-{cyrillic-ext,latin-ext,vietnamese,math,symbols}-*.woff2'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'font',
              handler: 'CacheFirst',
              options: { cacheName: 'milo-fonts', expiration: { maxEntries: 40 } },
            },
            {
              // WASM сканера штрихкода (~1 МБ) не предзагружаем всем (№57): кэш — после первого
              // открытия сканера, дальше он работает и без сети
              urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
              handler: 'CacheFirst',
              options: { cacheName: 'milo-scanner', expiration: { maxEntries: 2 } },
            },
          ],
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
