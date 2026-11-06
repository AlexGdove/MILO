import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom не реализует matchMedia, а модуль установки PWA проверяет режим standalone при импорте
const platform = vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  return { native: false };
});
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => platform.native } }));

import { ANDROID_APK_URL } from '@/shared/config';

import { AppPage } from './AppPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <AppPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  platform.native = false;
});

describe('Страница «Приложение»: APK для Android (решение №46)', () => {
  it('в браузере — ссылка на последнюю сборку, файл скачивается сразу', () => {
    renderPage();
    const link = screen.getByRole('link', { name: 'Скачать для Android (APK)' });
    expect(link).toHaveAttribute('href', ANDROID_APK_URL);
    expect(link).toHaveAttribute('download', 'milo.apk');
    expect(ANDROID_APK_URL).toBe(
      'https://github.com/AlexGdove/MILO/releases/download/android-latest/milo.apk',
    );
  });

  it('в самом Android-приложении ссылки нет — оно уже установлено', () => {
    platform.native = true;
    renderPage();
    expect(screen.queryByRole('link', { name: /Скачать для Android/ })).not.toBeInTheDocument();
  });

  it('перед скачиванием — предупреждение: данные из браузера не переносятся', () => {
    renderPage();
    expect(screen.getByText(/данные из браузера в него не переносятся/)).toBeInTheDocument();
  });

  it('«Установить на iPhone» ведёт к инструкции для Safari и подсвечивает её (решение №51)', async () => {
    const user = userEvent.setup();
    renderPage();
    const link = screen.getByRole('link', { name: 'Установить на iPhone' });
    expect(link).toHaveAttribute('href', '#iphone');
    await user.click(link);
    const steps = document.getElementById('iphone');
    expect(steps).toHaveFocus();
    expect(steps).toHaveTextContent('Откройте MILO в Safari');
  });

  it('на iPhone первым идёт установка через Safari, на других — APK', () => {
    const order = () =>
      screen
        .getAllByRole('link', { name: /Скачать для Android|Установить на iPhone/ })
        .map((link) => link.textContent);

    const { unmount } = renderPage();
    expect(order()).toEqual(['Скачать для Android (APK)', 'Установить на iPhone']);
    unmount();

    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
    );
    renderPage();
    expect(order()).toEqual(['Установить на iPhone', 'Скачать для Android (APK)']);
  });

  it('в мобильном приложении нет ни APK, ни установки на iPhone', () => {
    platform.native = true;
    renderPage();
    expect(screen.queryByRole('link', { name: 'Установить на iPhone' })).not.toBeInTheDocument();
  });
});
