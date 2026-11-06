import { Capacitor } from '@capacitor/core';

/** Запущено как мобильное приложение (Capacitor, решение №44), а не в браузере / PWA. */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

/**
 * iPhone / iPad (в том числе iPad, который представляется как Mac с сенсорным экраном).
 * Нужен, чтобы на iPhone первым показать установку через Safari (решение №51).
 */
export const isIos = (nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> = navigator): boolean =>
  /iPad|iPhone|iPod/.test(nav.userAgent) ||
  (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
