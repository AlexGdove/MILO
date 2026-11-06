import type { CapacitorConfig } from '@capacitor/cli';

/**
 * MILO для Android (решение №44): тот же фронтенд (`frontend/`) в нативной оболочке Capacitor.
 * Веб-часть собирается в режиме `mobile` (без service worker PWA) в `frontend/dist`.
 * `appId` — идентификатор приложения в магазинах; после публикации его не меняют.
 */
const config: CapacitorConfig = {
  appId: 'com.alexgdove.milo',
  appName: 'MILO',
  webDir: '../frontend/dist',
};

export default config;
