import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Что делает аппаратная кнопка «Назад» Android: открыт диалог — закрыть его;
 * есть куда вернуться — шаг назад; иначе — выйти из приложения (как в обычных приложениях).
 */
export function backButtonAction(canGoBack: boolean): 'close-dialog' | 'back' | 'exit' {
  if (document.querySelector('dialog[open]')) return 'close-dialog';
  return canGoBack ? 'back' : 'exit';
}

/**
 * Кнопка «Назад» в мобильном приложении (Capacitor, решение №44). Без обработки Android
 * сразу закрывает приложение. В браузере (PWA) ничего не делает — там кнопка браузерная.
 */
export function useNativeBackButton(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      const action = backButtonAction(canGoBack);
      if (action === 'close-dialog') {
        document.querySelector<HTMLDialogElement>('dialog[open]')?.close();
      } else if (action === 'back') {
        void navigate(-1);
      } else {
        void App.exitApp();
      }
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [navigate]);
}
