import { Capacitor } from '@capacitor/core';

/** Запущено как мобильное приложение (Capacitor, решение №44), а не в браузере / PWA. */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

/**
 * Платные функции (тарифы, фото-ИИ) доступны на этой платформе (решение №76). В приложении
 * из App Store их нет: по правилу 3.1.3(b) подписку с сайта можно включать только вместе с
 * покупкой внутри приложения (IAP), а её пока нет. PWA в Safari на iPhone — это сайт, там можно.
 */
export const paidFeaturesAvailable = (): boolean =>
  !(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios');

/**
 * iPhone / iPad (в том числе iPad, который представляется как Mac с сенсорным экраном).
 * Нужен, чтобы на iPhone первым показать установку через Safari (решение №51).
 */
export const isIos = (nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> = navigator): boolean =>
  /iPad|iPhone|iPod/.test(nav.userAgent) ||
  (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
