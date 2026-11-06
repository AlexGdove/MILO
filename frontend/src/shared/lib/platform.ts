import { Capacitor } from '@capacitor/core';

/** Запущено как мобильное приложение (Capacitor, решение №44), а не в браузере / PWA. */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();
